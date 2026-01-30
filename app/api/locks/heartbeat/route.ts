import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

const DRAW_DURATION_MS = 5 * 60 * 1000;

export async function POST(request: Request) {
  const body = await request.json();
  const { lockId, userId } = body ?? {};

  if (!lockId || !userId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const db = await getDb();
  const locks = db.collection("locks");
  const now = new Date();
  const expiresAt = new Date(Date.now() + DRAW_DURATION_MS);

  const result = await locks.updateOne(
    { _id: new ObjectId(lockId), userId, expiresAt: { $gt: now } },
    { $set: { expiresAt } }
  );

  if (result.matchedCount === 0) {
    return NextResponse.json({ error: "Lock not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, expiresAt: expiresAt.toISOString() });
}

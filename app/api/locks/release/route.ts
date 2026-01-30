import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { emitBoardUpdate } from "@/lib/events";

export async function POST(request: Request) {
  const body = await request.json();
  const { lockId, userId } = body ?? {};

  if (!lockId || !userId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const db = await getDb();
  const locks = db.collection("locks");

  const lock = await locks.findOne({ _id: new ObjectId(lockId), userId });
  if (!lock) {
    return NextResponse.json({ error: "Lock not found" }, { status: 404 });
  }

  await locks.deleteOne({ _id: lock._id });

  emitBoardUpdate({ boardId: lock.boardId.toString(), reason: "locks" });

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { getDb } from "@/lib/mongodb";

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password, secret } = body ?? {};

  if (!email || !password || !secret) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  if (secret !== process.env.ADMIN_SEED_SECRET) {
    console.log(secret)
    console.log(process.env.ADMIN_SEED_SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const admins = db.collection("admins");

  const existing = await admins.findOne({ email: email.toLowerCase() });
  if (existing) {
    return NextResponse.json({ error: "Admin already exists" }, { status: 409 });
  }

  const passwordHash = await hash(password, 12);
  const result = await admins.insertOne({
    email: email.toLowerCase(),
    passwordHash,
    createdAt: new Date(),
    role: "admin",
  });

  return NextResponse.json({ id: result.insertedId.toString() });
}

import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { getDb } from "@/lib/mongodb";
import { createSessionToken } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password } = body ?? {};

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const db = await getDb();
  const admins = db.collection("admins");

  const admin = await admins.findOne({ email: email.toLowerCase() });
  if (!admin) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const matches = await compare(password, admin.passwordHash);
  if (!matches) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await createSessionToken({
    userId: admin._id.toString(),
    role: "admin",
    email: admin.email,
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set("admin_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}

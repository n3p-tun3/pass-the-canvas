import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getAdminSession } from "@/lib/admin";

const DEFAULT_BOARD_SIZE = 5;

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const boards = db.collection("boards");

  const adminBoards = await boards
    .find({ createdBy: session.userId })
    .project({ name: 1, size: 1, createdAt: 1, active: 1 })
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json({
    boards: adminBoards.map((board) => ({
      id: board._id.toString(),
      name: board.name ?? "Untitled",
      size: board.size,
      createdAt: board.createdAt,
      active: board.active !== false,
    })),
  });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, size } = body ?? {};

  const boardSize = typeof size === "number" && size > 0 ? size : DEFAULT_BOARD_SIZE;
  const boardName = typeof name === "string" && name.trim().length > 0 ? name.trim() : "Untitled";

  const db = await getDb();
  const boards = db.collection("boards");

  const result = await boards.insertOne({
    name: boardName,
    size: boardSize,
    createdAt: new Date(),
    active: true,
    createdBy: session.userId,
  });

  return NextResponse.json({ id: result.insertedId.toString() });
}

export async function DELETE(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { boardId } = body ?? {};

  if (!boardId) {
    return NextResponse.json({ error: "Board id required" }, { status: 400 });
  }

  const db = await getDb();
  const boards = db.collection("boards");
  const tiles = db.collection("tiles");
  const locks = db.collection("locks");

  const board = await boards.findOne({ _id: new ObjectId(boardId), createdBy: session.userId });
  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  await tiles.deleteMany({ boardId: board._id });
  await locks.deleteMany({ boardId: board._id });
  await boards.deleteOne({ _id: board._id });

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { boardId, active } = body ?? {};

  if (!boardId || typeof active !== "boolean") {
    return NextResponse.json({ error: "Board id and active required" }, { status: 400 });
  }

  const db = await getDb();
  const boards = db.collection("boards");

  const result = await boards.updateOne(
    { _id: new ObjectId(boardId), createdBy: session.userId },
    { $set: { active } }
  );

  if (result.matchedCount === 0) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

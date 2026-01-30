import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { emitBoardUpdate } from "@/lib/events";

export async function POST(request: Request) {
  const body = await request.json();
  const { boardId, x, y, imageData, userId, lockId } = body ?? {};

  if (!boardId || typeof x !== "number" || typeof y !== "number" || !imageData || !userId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const db = await getDb();
  const boards = db.collection("boards");
  const tiles = db.collection("tiles");
  const locks = db.collection("locks");

  const board = await boards.findOne({ _id: new ObjectId(boardId) });
  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const existingTile = await tiles.findOne({ boardId: board._id, x, y });
  if (existingTile) {
    return NextResponse.json({ error: "Tile already exists" }, { status: 409 });
  }

  const totalTiles = await tiles.countDocuments({ boardId: board._id });

  if (totalTiles > 0) {
    if (!lockId) {
      return NextResponse.json({ error: "Lock required" }, { status: 400 });
    }

    const lock = await locks.findOne({ _id: new ObjectId(lockId), userId });
    if (!lock) {
      return NextResponse.json({ error: "Lock not found" }, { status: 404 });
    }

    if (lock.x !== x || lock.y !== y) {
      return NextResponse.json({ error: "Lock target mismatch" }, { status: 409 });
    }

    if (lock.expiresAt <= new Date()) {
      await locks.deleteOne({ _id: lock._id });
      return NextResponse.json({ error: "Lock expired" }, { status: 409 });
    }

    await locks.deleteOne({ _id: lock._id });
  } else if (x !== 0 || y !== 0) {
    return NextResponse.json({ error: "First tile must be at (0,0)" }, { status: 400 });
  }

  const result = await tiles.insertOne({
    boardId: board._id,
    x,
    y,
    imageData,
    createdBy: userId,
    createdAt: new Date(),
  });

  emitBoardUpdate({ boardId: board._id.toString(), reason: "tiles" });

  return NextResponse.json({
    tile: {
      id: result.insertedId.toString(),
      x,
      y,
    },
  });
}

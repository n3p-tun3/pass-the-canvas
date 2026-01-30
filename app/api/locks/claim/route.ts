import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { emitBoardUpdate } from "@/lib/events";

const DRAW_DURATION_MS = 5 * 60 * 1000;

const sideToDelta: Record<string, { dx: number; dy: number }> = {
  right: { dx: 1, dy: 0 },
  bottom: { dx: 0, dy: 1 },
};

export async function POST(request: Request) {
  const body = await request.json();
  const { boardId, fromTileId, side, userId } = body ?? {};

  if (!boardId || !fromTileId || !side || !userId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const delta = sideToDelta[side];
  if (!delta) {
    return NextResponse.json({ error: "Invalid side" }, { status: 400 });
  }

  const db = await getDb();
  const boards = db.collection("boards");
  const tiles = db.collection("tiles");
  const locks = db.collection("locks");

  const board = await boards.findOne({ _id: new ObjectId(boardId) });
  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const fromTile = await tiles.findOne({ _id: new ObjectId(fromTileId) });
  if (!fromTile) {
    return NextResponse.json({ error: "Source tile not found" }, { status: 404 });
  }

  const targetX = fromTile.x + delta.dx;
  const targetY = fromTile.y + delta.dy;

  if (targetX < 0 || targetY < 0 || targetX >= board.size || targetY >= board.size) {
    return NextResponse.json({ error: "Target outside board" }, { status: 400 });
  }

  const existingTile = await tiles.findOne({ boardId: board._id, x: targetX, y: targetY });
  if (existingTile) {
    return NextResponse.json({ error: "Tile already exists" }, { status: 409 });
  }

  const now = new Date();
  await locks.deleteMany({ boardId: board._id, expiresAt: { $lte: now } });

  const existingLock = await locks.findOne({ boardId: board._id, x: targetX, y: targetY, expiresAt: { $gt: now } });
  if (existingLock) {
    return NextResponse.json({ error: "Tile is locked" }, { status: 409 });
  }

  const expiresAt = new Date(Date.now() + DRAW_DURATION_MS);
  const result = await locks.insertOne({
    boardId: board._id,
    fromTileId: fromTile._id,
    side,
    x: targetX,
    y: targetY,
    userId,
    createdAt: now,
    expiresAt,
  });

  emitBoardUpdate({ boardId: board._id.toString(), reason: "locks" });

  return NextResponse.json({
    lock: {
      id: result.insertedId.toString(),
      x: targetX,
      y: targetY,
      side,
      expiresAt: expiresAt.toISOString(),
    },
    fromTile: {
      id: fromTile._id.toString(),
      x: fromTile.x,
      y: fromTile.y,
      imageData: fromTile.imageData,
    },
  });
}

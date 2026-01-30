import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

const BOARD_SIZE = 5;

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const db = await getDb();
  const boards = db.collection("boards");
  const tiles = db.collection("tiles");
  const locks = db.collection("locks");

  const { searchParams } = new URL(request.url);
  const boardId = searchParams.get("boardId");

  let board = boardId
    ? await boards.findOne({ _id: new ObjectId(boardId) })
    : await boards.findOne({ active: true });
  if (!board) {
    const result = await boards.insertOne({
      size: BOARD_SIZE,
      active: true,
      createdAt: new Date(),
    });
    board = await boards.findOne({ _id: result.insertedId });
  }

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 500 });
  }

  const now = new Date();
  await locks.deleteMany({ boardId: board._id, expiresAt: { $lte: now } });

  const boardTiles = await tiles
    .find({ boardId: board._id })
    .project({ imageData: 1, x: 1, y: 1, createdBy: 1, createdAt: 1 })
    .toArray();

  const boardLocks = await locks
    .find({ boardId: board._id, expiresAt: { $gt: now } })
    .project({ x: 1, y: 1, userId: 1, side: 1, fromTileId: 1, expiresAt: 1 })
    .toArray();

  return NextResponse.json({
    board: {
      id: board._id.toString(),
      size: board.size,
    },
    tiles: boardTiles.map((tile) => ({
      id: tile._id.toString(),
      x: tile.x,
      y: tile.y,
      imageData: tile.imageData,
      createdBy: tile.createdBy,
      createdAt: tile.createdAt,
    })),
    locks: boardLocks.map((lock) => ({
      id: lock._id.toString(),
      x: lock.x,
      y: lock.y,
      userId: lock.userId,
      side: lock.side,
      fromTileId: lock.fromTileId?.toString?.() ?? null,
      expiresAt: lock.expiresAt,
    })),
    serverTime: now.toISOString(),
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const db = await getDb();
  const boards = db.collection("boards");

  const board = await boards.findOne({ _id: new ObjectId(body.boardId) });
  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  await boards.updateOne({ _id: board._id }, { $set: { active: true } });
  return NextResponse.json({ ok: true });
}

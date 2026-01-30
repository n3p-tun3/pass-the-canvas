import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

const TILE_WIDTH = 560;
const TILE_HEIGHT = 360;
const OVERLAP_RATIO = 0.1;

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const boardId = searchParams.get("boardId");

  const db = await getDb();
  const boards = db.collection("boards");
  const tiles = db.collection("tiles");

  const board = boardId
    ? await boards.findOne({ _id: new ObjectId(boardId) })
    : await boards.findOne({ active: true });

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const boardTiles = await tiles
    .find({ boardId: board._id })
    .project({ imageData: 1, x: 1, y: 1 })
    .toArray();

  const overlapWidth = Math.round(TILE_WIDTH * OVERLAP_RATIO);
  const overlapHeight = Math.round(TILE_HEIGHT * OVERLAP_RATIO);
  const strideX = TILE_WIDTH - overlapWidth;
  const strideY = TILE_HEIGHT - overlapHeight;

  const width = board.size * TILE_WIDTH - (board.size - 1) * overlapWidth;
  const height = board.size * TILE_HEIGHT - (board.size - 1) * overlapHeight;

  const images = boardTiles
    .map((tile) => {
      const x = tile.x * strideX;
      const y = tile.y * strideY;
      return `<image href="${tile.imageData}" x="${x}" y="${y}" width="${TILE_WIDTH}" height="${TILE_HEIGHT}" preserveAspectRatio="none" />`;
    })
    .join("");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="100%" height="100%" fill="#ffffff" />` +
    images +
    `</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store",
    },
  });
}

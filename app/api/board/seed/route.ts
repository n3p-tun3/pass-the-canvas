import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { emitBoardUpdate } from "@/lib/events";
import { isAdminSession } from "@/lib/admin";

const TILE_WIDTH = 560;
const TILE_HEIGHT = 360;

const palette = ["#F43F5E", "#6366F1", "#22C55E", "#F59E0B", "#0EA5E9", "#A855F7"];

const makeSvgDataUrl = (label: string, color: string) => {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_WIDTH}" height="${TILE_HEIGHT}" viewBox="0 0 ${TILE_WIDTH} ${TILE_HEIGHT}">` +
    `<rect width="100%" height="100%" fill="${color}" />` +
    `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="48" fill="#ffffff">${label}</text>` +
    `</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export async function POST(request: Request) {
  const isAdmin = await isAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { boardId, replace = false, fillAll = true } = body ?? {};

  const db = await getDb();
  const boards = db.collection("boards");
  const tiles = db.collection("tiles");

  const board = boardId
    ? await boards.findOne({ _id: new ObjectId(boardId) })
    : await boards.findOne({ active: true });

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  if (replace) {
    await tiles.deleteMany({ boardId: board._id });
  }

  const existing = await tiles
    .find({ boardId: board._id })
    .project({ x: 1, y: 1 })
    .toArray();
  const occupied = new Set(existing.map((tile) => `${tile.x}-${tile.y}`));

  const inserts = [] as Array<{
    boardId: ObjectId;
    x: number;
    y: number;
    imageData: string;
    createdBy: string;
    createdAt: Date;
  }>;

  for (let y = 0; y < board.size; y += 1) {
    for (let x = 0; x < board.size; x += 1) {
      if (!fillAll && inserts.length >= 6) break;
      const key = `${x}-${y}`;
      if (occupied.has(key)) continue;
      const label = `${x},${y}`;
      const color = palette[(x + y) % palette.length];
      inserts.push({
        boardId: board._id,
        x,
        y,
        imageData: makeSvgDataUrl(label, color),
        createdBy: "seed",
        createdAt: new Date(),
      });
    }
  }

  if (inserts.length > 0) {
    await tiles.insertMany(inserts);
    emitBoardUpdate({ boardId: board._id.toString(), reason: "tiles" });
  }

  return NextResponse.json({ inserted: inserts.length });
}

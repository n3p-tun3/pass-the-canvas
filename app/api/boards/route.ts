import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getDb();
  const boards = db.collection("boards");

  const list = await boards
    .find({ active: { $ne: false } })
    .project({ name: 1, size: 1, createdAt: 1 })
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json({
    boards: list.map((board) => ({
      id: board._id.toString(),
      name: board.name ?? "Untitled",
      size: board.size,
      createdAt: board.createdAt,
    })),
  });
}

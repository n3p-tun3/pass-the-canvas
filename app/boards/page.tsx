"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BoardMap from "@/app/components/BoardMap";

type Board = {
  id: string;
  name: string;
  size: number;
  createdAt: string;
};

type BoardSnapshot = {
  boardId: string | null;
  size: number;
  tiles: Array<{ x: number; y: number }>;
  locks: Array<{ x: number; y: number }>;
};

export default function BoardsPage() {
  const router = useRouter();
  const [boards, setBoards] = useState<Board[]>([]);
  const [selected, setSelected] = useState<Board | null>(null);
  const [snapshot, setSnapshot] = useState<BoardSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/boards")
      .then((res) => res.json())
      .then((data) => {
        setBoards(data.boards ?? []);
        if (data.boards?.length) {
          setSelected(data.boards[0]);
        }
      })
      .catch(() => setError("Failed to load boards"));
  }, []);

  useEffect(() => {
    if (!selected) return;
    fetch(`/api/board?boardId=${selected.id}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        setSnapshot({
          boardId: data.board.id,
          size: data.board.size,
          tiles: data.tiles.map((tile: { x: number; y: number }) => ({ x: tile.x, y: tile.y })),
          locks: data.locks.map((lock: { x: number; y: number }) => ({ x: lock.x, y: lock.y })),
        });
      })
      .catch(() => setError("Failed to load board"));
  }, [selected]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-12 text-zinc-900">
      <main className="w-full max-w-6xl space-y-8">
        <header className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold">Browse boards</h1>
          <p className="text-sm text-zinc-500">Pick a board to see its progress.</p>
        </header>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-4">
            {boards.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200 p-4 text-sm text-zinc-500">
                No boards yet.
              </div>
            ) : (
              boards.map((board) => (
                <button
                  key={board.id}
                  type="button"
                  onClick={() => setSelected(board)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                    selected?.id === board.id
                      ? "border-indigo-300 bg-indigo-50"
                      : "border-zinc-200 bg-white hover:border-indigo-200"
                  }`}
                >
                  <p className="text-sm font-semibold">{board.name}</p>
                  <p className="text-xs text-zinc-500">
                    {board.size} × {board.size} · {new Date(board.createdAt).toLocaleDateString()}
                  </p>
                </button>
              ))
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">Board map</h2>
                  <p className="text-xs text-zinc-500">Preview the progress before joining.</p>
                </div>
                {selected && (
                  <button
                    type="button"
                    onClick={() => router.push(`/?boardId=${selected.id}`)}
                    className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
                  >
                    Open board
                  </button>
                )}
              </div>

              {snapshot ? (
                <div className="mt-4">
                  <BoardMap
                    size={snapshot.size}
                    tiles={snapshot.tiles}
                    locks={snapshot.locks}
                    openTargets={[]}
                  />
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-zinc-200 p-4 text-xs text-zinc-500">
                  Select a board to preview.
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

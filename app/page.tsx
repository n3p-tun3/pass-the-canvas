"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BoardMap from "@/app/components/BoardMap";
import type { OpenTarget } from "@/app/components/BoardMap";

const ALLOWED_SIDES: Array<"right" | "bottom"> = ["right", "bottom"];

type Tile = {
  id: string;
  x: number;
  y: number;
  imageData: string;
  createdBy: string;
  createdAt: string;
};

type Lock = {
  id: string;
  x: number;
  y: number;
  userId: string;
  side: "right" | "bottom";
  fromTileId: string | null;
  expiresAt: string;
};

type BoardState = {
  boardId: string | null;
  size: number;
  tiles: Tile[];
  locks: Lock[];
  serverTime: string | null;
};

type MoveOption = {
  fromTile: Tile;
  side: "right" | "bottom";
  targetX: number;
  targetY: number;
};

type TargetGroup = {
  key: string;
  x: number;
  y: number;
  moves: MoveOption[];
};

export default function Home() {
  const router = useRouter();
  const [boardState, setBoardState] = useState<BoardState>({
    boardId: null,
    size: 5,
    tiles: [],
    locks: [],
    serverTime: null,
  });
  const [error, setError] = useState<string | null>(null);

  const fetchBoard = async () => {
    const response = await fetch("/api/board", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error ?? "Failed to load board");
    }
    setBoardState({
      boardId: data.board.id,
      size: data.board.size,
      tiles: data.tiles,
      locks: data.locks,
      serverTime: data.serverTime,
    });
  };

  useEffect(() => {
    fetchBoard().catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!boardState.boardId) return;
    const source = new EventSource(`/api/board/stream?boardId=${boardState.boardId}`);
    source.onmessage = () => {
      fetchBoard().catch(() => undefined);
    };
    return () => source.close();
  }, [boardState.boardId]);

  const moves = useMemo<MoveOption[]>(() => {
    if (boardState.tiles.length === 0) return [];
    const occupied = new Set(boardState.tiles.map((tile) => `${tile.x}-${tile.y}`));
    const locked = new Set(boardState.locks.map((lock) => `${lock.x}-${lock.y}`));
    const options: MoveOption[] = [];

    for (const tile of boardState.tiles) {
      for (const side of ALLOWED_SIDES) {
        const targetX = side === "right" ? tile.x + 1 : tile.x;
        const targetY = side === "bottom" ? tile.y + 1 : tile.y;

        if (targetX < 0 || targetY < 0 || targetX >= boardState.size || targetY >= boardState.size) {
          continue;
        }

        const key = `${targetX}-${targetY}`;
        if (occupied.has(key) || locked.has(key)) continue;

        options.push({ fromTile: tile, side, targetX, targetY });
      }
    }

    return options;
  }, [boardState.tiles, boardState.locks, boardState.size]);

  const targetGroups = useMemo<TargetGroup[]>(() => {
    const map = new Map<string, TargetGroup>();
    moves.forEach((move) => {
      const key = `${move.targetX}-${move.targetY}`;
      if (!map.has(key)) {
        map.set(key, { key, x: move.targetX, y: move.targetY, moves: [move] });
        return;
      }
      map.get(key)?.moves.push(move);
    });
    return Array.from(map.values());
  }, [moves]);

  const openTargets: OpenTarget[] = useMemo(
    () =>
      targetGroups.map((group) => ({
        key: group.key,
        x: group.x,
        y: group.y,
      })),
    [targetGroups]
  );

  const lockedCount = boardState.locks.length;
  const isFirst = boardState.tiles.length === 0;

  const goToDraw = (move: MoveOption) => {
    if (!boardState.boardId) return;
    router.push(
      `/draw?boardId=${boardState.boardId}&fromTileId=${move.fromTile.id}&side=${move.side}`
    );
  };

  const goToFirst = () => {
    if (!boardState.boardId) return;
    router.push(`/draw?boardId=${boardState.boardId}&first=1`);
  };

  const handleRandomStart = () => {
    if (moves.length === 0) return;
    const index = Math.floor(Math.random() * moves.length);
    goToDraw(moves[index]);
  };

  const handleSelectTarget = (target: OpenTarget) => {
    const group = targetGroups.find((entry) => entry.key === target.key);
    if (!group || group.moves.length === 0) return;
    const move = group.moves[Math.floor(Math.random() * group.moves.length)];
    goToDraw(move);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-12 text-zinc-900">
      <main className="w-full max-w-6xl space-y-8">
        <header className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold">Picture-Tile Collab</h1>
          <p className="text-sm text-zinc-500">
            Pick an open tile to keep the collage flowing.
          </p>
        </header>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Board status</h2>
              <p className="text-sm text-zinc-500">
                Tiles: {boardState.tiles.length} / {boardState.size * boardState.size} ·
                Active drawers: {lockedCount}
              </p>
            </div>
            {isFirst && (
              <button
                type="button"
                onClick={goToFirst}
                className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Start first tile
              </button>
            )}
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold">Available tiles</h3>
                  <p className="text-xs text-zinc-500">Choose a tile or roll randomly.</p>
                </div>
                <button
                  type="button"
                  disabled={moves.length === 0}
                  onClick={handleRandomStart}
                  className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Random spot
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                {targetGroups.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-200 p-4 text-xs text-zinc-500">
                    No open tiles right now. Check back soon.
                  </div>
                ) : (
                  targetGroups.map((group) => (
                    <button
                      key={group.key}
                      type="button"
                      onClick={() => handleSelectTarget({ key: group.key, x: group.x, y: group.y })}
                      className="group flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left transition hover:border-indigo-300"
                    >
                      <div>
                        <p className="text-xs text-zinc-500">Open tile</p>
                        <p className="text-sm font-semibold">
                          ({group.x}, {group.y})
                        </p>
                        <p className="text-xs text-zinc-400">
                          {group.moves
                            .map((move) => `${move.side} from (${move.fromTile.x}, ${move.fromTile.y})`)
                            .join(" · ")}
                        </p>
                      </div>
                      <span className="text-xl text-zinc-400 group-hover:text-indigo-500">➜</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold">Board map</h3>
                  <p className="text-xs text-zinc-500">Click an open tile to begin drawing.</p>
                </div>
                <div className="text-xs text-zinc-400">Open: {moves.length}</div>
              </div>
              <div className="mt-4">
                <BoardMap
                  size={boardState.size}
                  tiles={boardState.tiles}
                  locks={boardState.locks}
                  openTargets={openTargets}
                  onSelectOpenAction={handleSelectTarget}
                />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

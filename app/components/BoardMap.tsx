"use client";

import type { ReactNode } from "react";

export type BoardTile = {
  x: number;
  y: number;
};

export type BoardLock = {
  x: number;
  y: number;
};

export type OpenTarget = {
  x: number;
  y: number;
  key: string;
  badge?: ReactNode;
};

type BoardMapProps = {
  size: number;
  tiles: BoardTile[];
  locks: BoardLock[];
  openTargets: OpenTarget[];
  onSelectOpenAction?: (target: OpenTarget) => void;
};

export default function BoardMap({
  size,
  tiles,
  locks,
  openTargets,
  onSelectOpenAction,
}: BoardMapProps) {
  const openSet = new Set(openTargets.map((target) => target.key));

  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: size * size }).map((_, index) => {
        const x = index % size;
        const y = Math.floor(index / size);
        const key = `${x}-${y}`;
        const tile = tiles.find((t) => t.x === x && t.y === y);
        const lock = locks.find((l) => l.x === x && l.y === y);
        const open = openSet.has(key);
        const target = openTargets.find((t) => t.key === key);

        const content = tile
          ? "Filled"
          : lock
          ? "Locked"
          : open
          ? "Open"
          : "";

        const baseClass = tile
          ? "border-zinc-200 bg-zinc-900 text-white"
          : lock
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : open
          ? "border-indigo-200 bg-indigo-50 text-indigo-700"
          : "border-zinc-200 bg-zinc-50 text-zinc-400";

        if (open && target && onSelectOpenAction) {
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectOpenAction(target)}
              className={`flex aspect-square items-center justify-center rounded-lg border text-[10px] font-medium transition hover:border-indigo-400 ${baseClass}`}
            >
              {content}
            </button>
          );
        }

        return (
          <div
            key={key}
            className={`flex aspect-square items-center justify-center rounded-lg border text-[10px] font-medium ${baseClass}`}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";

const CANVAS_WIDTH = 560;
const CANVAS_HEIGHT = 360;
const SLICE_RATIO = 0.1;
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

type DrawingState = {
  lockId: string | null;
  targetX: number;
  targetY: number;
  side: "right" | "bottom" | null;
  seedImage: string | null;
  expiresAt: string | null;
};

const getUserId = () => {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem("ptc-user-id");
  if (existing) return existing;
  const next = crypto.randomUUID();
  window.localStorage.setItem("ptc-user-id", next);
  return next;
};

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [boardState, setBoardState] = useState<BoardState>({
    boardId: null,
    size: 5,
    tiles: [],
    locks: [],
    serverTime: null,
  });
  const [drawingState, setDrawingState] = useState<DrawingState>({
    lockId: null,
    targetX: 0,
    targetY: 0,
    side: null,
    seedImage: null,
    expiresAt: null,
  });
  const [error, setError] = useState<string | null>(null);

  const timeLeft = useMemo(() => {
    if (!drawingState.expiresAt) return null;
    const expiresAt = new Date(drawingState.expiresAt).getTime();
    const remainingMs = expiresAt - Date.now();
    return Math.max(0, Math.floor(remainingMs / 1000));
  }, [drawingState.expiresAt]);

  useEffect(() => {
    setUserId(getUserId());
  }, []);

  useEffect(() => {
    const setupCanvas = (canvas: HTMLCanvasElement | null) => {
      if (!canvas) return;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = CANVAS_WIDTH * ratio;
      canvas.height = CANVAS_HEIGHT * ratio;
      canvas.style.width = `${CANVAS_WIDTH}px`;
      canvas.style.height = `${CANVAS_HEIGHT}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#111827";
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
    };

    setupCanvas(canvasRef.current);
  }, []);

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

  useEffect(() => {
    if (!drawingState.lockId) return;
    const interval = setInterval(() => {
      fetch("/api/locks/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lockId: drawingState.lockId, userId }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.expiresAt) {
            setDrawingState((prev) => ({ ...prev, expiresAt: data.expiresAt }));
          }
        })
        .catch(() => undefined);
    }, 20000);
    return () => clearInterval(interval);
  }, [drawingState.lockId, userId]);

  useEffect(() => {
    if (!drawingState.expiresAt) return;
    const interval = setInterval(() => {
      if (new Date(drawingState.expiresAt).getTime() <= Date.now()) {
        setDrawingState({
          lockId: null,
          targetX: 0,
          targetY: 0,
          side: null,
          seedImage: null,
          expiresAt: null,
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [drawingState.expiresAt]);

  const resetCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  };

  const applySeed = async (seedImage: string | null, side: DrawingState["side"]) => {
    resetCanvas();
    if (!seedImage || !side) return;

    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load seed image"));
      img.src = seedImage;
    });

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sliceWidth = Math.round(CANVAS_WIDTH * SLICE_RATIO);
    const sliceHeight = Math.round(CANVAS_HEIGHT * SLICE_RATIO);

    if (side === "right") {
      ctx.drawImage(
        img,
        CANVAS_WIDTH - sliceWidth,
        0,
        sliceWidth,
        CANVAS_HEIGHT,
        0,
        0,
        sliceWidth,
        CANVAS_HEIGHT
      );
    }

    if (side === "bottom") {
      ctx.drawImage(
        img,
        0,
        CANVAS_HEIGHT - sliceHeight,
        CANVAS_WIDTH,
        sliceHeight,
        0,
        0,
        CANVAS_WIDTH,
        sliceHeight
      );
    }
  };

  useEffect(() => {
    applySeed(drawingState.seedImage, drawingState.side).catch(() => undefined);
  }, [drawingState.seedImage, drawingState.side]);

  const getPoint = (event: PointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(event.pointerId);
    setIsDrawing(true);
    lastPointRef.current = getPoint(event, canvas);
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const nextPoint = getPoint(event, canvas);
    const lastPoint = lastPointRef.current;
    if (!lastPoint) {
      lastPointRef.current = nextPoint;
      return;
    }
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(nextPoint.x, nextPoint.y);
    ctx.stroke();
    lastPointRef.current = nextPoint;
  };

  const handlePointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture(event.pointerId);
    }
    setIsDrawing(false);
    lastPointRef.current = null;
  };

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

  const lockedCount = boardState.locks.length;

  const startFirstTile = () => {
    setDrawingState({
      lockId: null,
      targetX: 0,
      targetY: 0,
      side: null,
      seedImage: null,
      expiresAt: null,
    });
    resetCanvas();
  };

  const claimMove = async (move: MoveOption) => {
    setError(null);
    if (!userId || !boardState.boardId) {
      throw new Error("User session not ready yet");
    }
    const response = await fetch("/api/locks/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boardId: boardState.boardId,
        fromTileId: move.fromTile.id,
        side: move.side,
        userId,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error ?? "Failed to claim edge");
    }

    setDrawingState({
      lockId: data.lock.id,
      targetX: data.lock.x,
      targetY: data.lock.y,
      side: data.lock.side,
      seedImage: data.fromTile.imageData,
      expiresAt: data.lock.expiresAt,
    });
  };

  const releaseLock = async () => {
    if (!drawingState.lockId || !userId) return;
    await fetch("/api/locks/release", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lockId: drawingState.lockId, userId }),
    });
    setDrawingState({
      lockId: null,
      targetX: 0,
      targetY: 0,
      side: null,
      seedImage: null,
      expiresAt: null,
    });
  };

  const submitTile = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !boardState.boardId || !userId) return;
    const imageData = canvas.toDataURL("image/png");

    const response = await fetch("/api/tiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boardId: boardState.boardId,
        x: drawingState.targetX,
        y: drawingState.targetY,
        imageData,
        userId,
        lockId: drawingState.lockId,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error ?? "Failed to submit tile");
    }

    setDrawingState({
      lockId: null,
      targetX: 0,
      targetY: 0,
      side: null,
      seedImage: null,
      expiresAt: null,
    });
    resetCanvas();
  };

  const isFirst = boardState.tiles.length === 0;
  const isDrawingMode = drawingState.lockId !== null || isFirst;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-12 text-zinc-900">
      <main className="w-full max-w-5xl space-y-8">
        <header className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold">Picture-Tile Collab</h1>
          <p className="text-sm text-zinc-500">
            Draw one tile, then pass a 10% overlap to the next artist.
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
            {drawingState.expiresAt && timeLeft !== null && (
              <div className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium">
                Time left: {timeLeft}s
              </div>
            )}
          </div>
        </section>

        {isFirst ? (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Start the first tile</h2>
              <button
                type="button"
                onClick={startFirstTile}
                className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Begin
              </button>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <canvas
                ref={canvasRef}
                className="touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => submitTile().catch((err) => setError(err.message))}
                className="rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Submit first tile
              </button>
            </div>
          </section>
        ) : isDrawingMode ? (
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Draw your tile</h2>
                <p className="text-sm text-zinc-500">
                  Target position: ({drawingState.targetX}, {drawingState.targetY})
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => releaseLock().catch(() => undefined)}
                  className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium"
                >
                  Release
                </button>
                <button
                  type="button"
                  onClick={() => submitTile().catch((err) => setError(err.message))}
                  className="rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  Submit tile
                </button>
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <canvas
                ref={canvasRef}
                className="touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              />
            </div>
          </section>
        ) : (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Pick an available edge</h2>
              <p className="text-sm text-zinc-500">Only open edges are selectable.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {moves.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-200 p-6 text-sm text-zinc-500">
                  No open edges right now. Check back soon.
                </div>
              ) : (
                moves.map((move) => (
                  <button
                    key={`${move.fromTile.id}-${move.side}`}
                    type="button"
                    onClick={() => claimMove(move).catch((err) => setError(err.message))}
                    className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-left shadow-sm transition hover:border-indigo-300"
                  >
                    <div>
                      <p className="text-sm text-zinc-500">From ({move.fromTile.x}, {move.fromTile.y})</p>
                      <p className="text-base font-semibold">Draw to the {move.side}</p>
                      <p className="text-xs text-zinc-400">Target ({move.targetX}, {move.targetY})</p>
                    </div>
                    <span className="text-2xl">{move.side === "right" ? "➜" : "⬇"}</span>
                  </button>
                ))
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

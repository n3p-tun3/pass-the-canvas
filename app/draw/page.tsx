"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CanvasPanel from "@/app/components/CanvasPanel";
import PaintToolbar from "@/app/components/PaintToolbar";

const CANVAS_WIDTH = 560;
const CANVAS_HEIGHT = 360;
const SLICE_RATIO = 0.1;

type DrawingState = {
  lockId: string | null;
  targetX: number;
  targetY: number;
  side: "right" | "bottom" | null;
  seedImage: string | null;
  expiresAt: string | null;
};

type NeighborSeed = {
  imageData: string;
  side: "left" | "right" | "top" | "bottom";
};

const getUserId = () => {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem("ptc-user-id");
  if (existing) return existing;
  const next = crypto.randomUUID();
  window.localStorage.setItem("ptc-user-id", next);
  return next;
};

export default function DrawPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [drawingState, setDrawingState] = useState<DrawingState>({
    lockId: null,
    targetX: 0,
    targetY: 0,
    side: null,
    seedImage: null,
    expiresAt: null,
  });

  const boardId = searchParams.get("boardId");
  const fromTileId = searchParams.get("fromTileId");
  const sideParam = searchParams.get("side") as "right" | "bottom" | null;
  const isFirst = searchParams.get("first") === "1";

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

  const resetCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  };

  const applySeeds = async (seeds: NeighborSeed[]) => {
    resetCanvas();
    if (seeds.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sliceWidth = Math.round(CANVAS_WIDTH * SLICE_RATIO);
    const sliceHeight = Math.round(CANVAS_HEIGHT * SLICE_RATIO);

    for (const seed of seeds) {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load seed image"));
        img.src = seed.imageData;
      });

      if (seed.side === "left") {
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

      if (seed.side === "right") {
        ctx.drawImage(
          img,
          0,
          0,
          sliceWidth,
          CANVAS_HEIGHT,
          CANVAS_WIDTH - sliceWidth,
          0,
          sliceWidth,
          CANVAS_HEIGHT
        );
      }

      if (seed.side === "top") {
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

      if (seed.side === "bottom") {
        ctx.drawImage(
          img,
          0,
          0,
          CANVAS_WIDTH,
          sliceHeight,
          0,
          CANVAS_HEIGHT - sliceHeight,
          CANVAS_WIDTH,
          sliceHeight
        );
      }
    }
  };

  const loadNeighborSeeds = async (targetX: number, targetY: number) => {
    if (!boardId) return [] as NeighborSeed[];
    const response = await fetch(`/api/board?boardId=${boardId}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) return [] as NeighborSeed[];
    const tiles = data.tiles as Array<{ x: number; y: number; imageData: string }>;
    const seeds: NeighborSeed[] = [];

    const left = tiles.find((tile) => tile.x === targetX - 1 && tile.y === targetY);
    const right = tiles.find((tile) => tile.x === targetX + 1 && tile.y === targetY);
    const top = tiles.find((tile) => tile.x === targetX && tile.y === targetY - 1);
    const bottom = tiles.find((tile) => tile.x === targetX && tile.y === targetY + 1);

    if (left) seeds.push({ imageData: left.imageData, side: "left" });
    if (right) seeds.push({ imageData: right.imageData, side: "right" });
    if (top) seeds.push({ imageData: top.imageData, side: "top" });
    if (bottom) seeds.push({ imageData: bottom.imageData, side: "bottom" });

    return seeds;
  };

  useEffect(() => {
    if (isFirst) {
      setDrawingState({
        lockId: null,
        targetX: 0,
        targetY: 0,
        side: null,
        seedImage: null,
        expiresAt: null,
      });
      resetCanvas();
    }
  }, [isFirst]);

  useEffect(() => {
    if (isFirst || !boardId || !fromTileId || !sideParam || !userId) return;
    let isActive = true;

    fetch("/api/locks/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardId, fromTileId, side: sideParam, userId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!isActive) return;
        if (data?.error) {
          setError(data.error);
          return;
        }
        setDrawingState({
          lockId: data.lock.id,
          targetX: data.lock.x,
          targetY: data.lock.y,
          side: data.lock.side,
          seedImage: data.fromTile.imageData,
          expiresAt: data.lock.expiresAt,
        });
        loadNeighborSeeds(data.lock.x, data.lock.y)
          .then((seeds) => applySeeds(seeds))
          .catch(() => undefined);
      })
      .catch((err) => {
        if (!isActive) return;
        setError(err.message);
      });

    return () => {
      isActive = false;
    };
  }, [boardId, fromTileId, sideParam, userId, isFirst]);

  useEffect(() => {
    if (!drawingState.lockId || !userId) return;
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
    return () => {
      if (!drawingState.lockId || !userId) return;
      fetch("/api/locks/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lockId: drawingState.lockId, userId }),
      }).catch(() => undefined);
    };
  }, [drawingState.lockId, userId]);

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

  const submitTile = async () => {
    if (!boardId || !userId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const imageData = canvas.toDataURL("image/png");

    const response = await fetch("/api/tiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boardId,
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

    router.push("/");
  };

  const releaseLock = async () => {
    if (!drawingState.lockId || !userId) return;
    await fetch("/api/locks/release", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lockId: drawingState.lockId, userId }),
    });
    router.push("/");
  };

  const isReady = isFirst || drawingState.lockId !== null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-12 text-zinc-900">
      <main className="w-full max-w-5xl space-y-6">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Drawing board</p>
          <h1 className="text-3xl font-semibold">Stay in flow</h1>
          <p className="text-sm text-zinc-500">
            Build on the 10% handoff and keep the picture seamless.
          </p>
        </header>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Session</h2>
              <p className="text-xs text-zinc-500">
                Target: ({drawingState.targetX}, {drawingState.targetY}) · Board {boardId ?? "-"}
              </p>
            </div>
            {drawingState.expiresAt && timeLeft !== null && (
              <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold">
                Time left: {timeLeft}s
              </div>
            )}
          </div>
          <div className="mt-4">
            <PaintToolbar />
          </div>
        </section>

        <CanvasPanel
          title="Your canvas"
          subtitle={
            isFirst
              ? "Create the first tile in the grid."
              : "Continue the drawing from the seeded overlap."
          }
          isActive={isReady}
          canvasRef={canvasRef}
          onPointerDownAction={handlePointerDown}
          onPointerMoveAction={handlePointerMove}
          onPointerUpAction={handlePointerUp}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium"
              >
                Back to board
              </button>
              <div className="flex items-center gap-2">
                {!isFirst && (
                  <button
                    type="button"
                    onClick={() => releaseLock().catch(() => undefined)}
                    className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium"
                  >
                    Release
                  </button>
                )}
                <button
                  type="button"
                  disabled={!isReady}
                  onClick={() => submitTile().catch((err) => setError(err.message))}
                  className="rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Submit tile
                </button>
              </div>
            </div>
          }
        />
      </main>
    </div>
  );
}

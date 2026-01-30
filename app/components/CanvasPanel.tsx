"use client";

import type { ReactNode } from "react";
import type { PointerEvent } from "react";

type CanvasPanelProps = {
  title: string;
  subtitle?: string;
  isActive: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onPointerDownAction: (event: PointerEvent<HTMLCanvasElement>) => void;
  onPointerMoveAction: (event: PointerEvent<HTMLCanvasElement>) => void;
  onPointerUpAction: (event: PointerEvent<HTMLCanvasElement>) => void;
  footer?: ReactNode;
  headerAction?: ReactNode;
};

export default function CanvasPanel({
  title,
  subtitle,
  isActive,
  canvasRef,
  onPointerDownAction,
  onPointerMoveAction,
  onPointerUpAction,
  footer,
  headerAction,
}: CanvasPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {subtitle && <p className="text-sm text-zinc-500">{subtitle}</p>}
        </div>
        {headerAction}
      </div>

      <div className="relative inline-block rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {!isActive && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-white/80 text-sm font-medium text-zinc-500">
            Choose an available tile to unlock the canvas
          </div>
        )}
        <canvas
          ref={canvasRef}
          className={`block touch-none ${!isActive ? "pointer-events-none opacity-60" : ""}`}
          onPointerDown={onPointerDownAction}
          onPointerMove={onPointerMoveAction}
          onPointerUp={onPointerUpAction}
          onPointerLeave={onPointerUpAction}
        />
      </div>

      {footer}
    </div>
  );
}

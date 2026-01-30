"use client";

const toolButton =
  "rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 transition hover:border-indigo-300 hover:text-indigo-500";

export default function PaintToolbar() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className={toolButton}>
        Pencil
      </button>
      <button type="button" className={toolButton}>
        Marker
      </button>
      <button type="button" className={toolButton}>
        Eraser
      </button>
      <div className="mx-2 h-4 w-px bg-zinc-200" />
      <button type="button" className={toolButton}>
        Thin
      </button>
      <button type="button" className={toolButton}>
        Medium
      </button>
      <button type="button" className={toolButton}>
        Thick
      </button>
      <div className="mx-2 h-4 w-px bg-zinc-200" />
      <button type="button" className={toolButton}>
        #111827
      </button>
      <button type="button" className={toolButton}>
        #6366F1
      </button>
      <button type="button" className={toolButton}>
        #EF4444
      </button>
    </div>
  );
}

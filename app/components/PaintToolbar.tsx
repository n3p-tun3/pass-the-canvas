"use client";

type Tool = "marker" | "eraser";
type Size = "small" | "medium" | "large";

type PaintToolbarProps = {
  activeTool: Tool;
  activeSize: Size;
  color: string;
  onToolChangeAction: (tool: Tool) => void;
  onSizeChangeAction: (size: Size) => void;
  onColorChangeAction: (color: string) => void;
};

const baseButton =
  "rounded-full border px-3 py-1 text-xs font-medium transition";

const activeButton =
  "border-indigo-400 bg-indigo-50 text-indigo-600";

const idleButton =
  "border-zinc-200 text-zinc-600 hover:border-indigo-300 hover:text-indigo-500";

export default function PaintToolbar({
  activeTool,
  activeSize,
  color,
  onToolChangeAction,
  onSizeChangeAction,
  onColorChangeAction,
}: PaintToolbarProps) {
  const toolClass = (tool: Tool) =>
    `${baseButton} ${activeTool === tool ? activeButton : idleButton}`;
  const sizeClass = (size: Size) =>
    `${baseButton} ${activeSize === size ? activeButton : idleButton}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className={toolClass("marker")}
        onClick={() => onToolChangeAction("marker")}
      >
        Marker
      </button>
      <button
        type="button"
        className={toolClass("eraser")}
        onClick={() => onToolChangeAction("eraser")}
      >
        Eraser
      </button>
      <div className="mx-2 h-4 w-px bg-zinc-200" />
      <button
        type="button"
        className={sizeClass("small")}
        onClick={() => onSizeChangeAction("small")}
      >
        Small
      </button>
      <button
        type="button"
        className={sizeClass("medium")}
        onClick={() => onSizeChangeAction("medium")}
      >
        Medium
      </button>
      <button
        type="button"
        className={sizeClass("large")}
        onClick={() => onSizeChangeAction("large")}
      >
        Large
      </button>
      <div className="mx-2 h-4 w-px bg-zinc-200" />
      <label className="flex items-center gap-2 text-xs text-zinc-500">
        Color
        <input
          type="color"
          value={color}
          onChange={(event) => onColorChangeAction(event.target.value)}
          className="h-8 w-8 rounded-full border border-zinc-200 bg-transparent p-0"
        />
      </label>
    </div>
  );
}

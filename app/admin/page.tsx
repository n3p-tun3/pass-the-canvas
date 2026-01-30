"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminHome() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [boards, setBoards] = useState<
    Array<{ id: string; name: string; size: number; createdAt: string; active: boolean }>
  >([]);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardSize, setNewBoardSize] = useState(5);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data?.authenticated) {
          router.push("/admin/login");
          return;
        }
        setStatus(`Signed in as ${data.user.email}`);
      })
      .catch(() => setStatus("Failed to load session"));
  }, [router]);

  const loadBoards = async () => {
    const response = await fetch("/api/admin/boards");
    const data = await response.json();
    if (!response.ok) {
      setStatus(data?.error ?? "Failed to load boards");
      return;
    }
    setBoards(data.boards ?? []);
  };

  useEffect(() => {
    loadBoards().catch(() => undefined);
  }, []);

  const handleSeed = async (id?: string | null) => {
    setStatus("Seeding board...");
    const targetId = id ?? boardId;
    const response = await fetch("/api/board/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardId: targetId, fillAll: true }),
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data?.error ?? "Seed failed");
      return;
    }
    setStatus(`Seeded ${data.inserted} tiles.`);
  };

  const handleCreateBoard = async () => {
    setStatus("Creating board...");
    const response = await fetch("/api/admin/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newBoardName, size: newBoardSize }),
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data?.error ?? "Create failed");
      return;
    }
    setNewBoardName("");
    setStatus("Board created.");
    loadBoards().catch(() => undefined);
  };

  const handleDeleteBoard = async (id: string) => {
    const response = await fetch("/api/admin/boards", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardId: id }),
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data?.error ?? "Delete failed");
      return;
    }
    setStatus("Board deleted.");
    if (boardId === id) {
      setBoardId(null);
    }
    loadBoards().catch(() => undefined);
  };

  const handleTogglePublish = async (id: string, active: boolean) => {
    const response = await fetch("/api/admin/boards", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardId: id, active }),
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data?.error ?? "Update failed");
      return;
    }
    setStatus(active ? "Board published." : "Board unpublished.");
    loadBoards().catch(() => undefined);
  };

  const handleAssemble = (id?: string | null) => {
    const targetId = id ?? boardId;
    const url = targetId
      ? `/api/board/assemble?boardId=${targetId}`
      : "/api/board/assemble";
    window.open(url, "_blank");
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-12 text-zinc-900">
      <main className="w-full max-w-3xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Admin console</h1>
          <p className="text-sm text-zinc-500">Manage collaborative boards.</p>
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div className="space-y-3">
              <h2 className="text-base font-semibold">Create a board</h2>
              <div className="grid gap-3 sm:grid-cols-[1.5fr_0.5fr_auto]">
                <input
                  type="text"
                  value={newBoardName}
                  onChange={(event) => setNewBoardName(event.target.value)}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                  placeholder="Board name"
                />
                <input
                  type="number"
                  min={2}
                  value={newBoardSize}
                  onChange={(event) => setNewBoardSize(Number(event.target.value))}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCreateBoard}
                  className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  Create
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-700" htmlFor="boardId">
                Board ID (optional)
              </label>
              <input
                id="boardId"
                type="text"
                value={boardId ?? ""}
                onChange={(event) => setBoardId(event.target.value || null)}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                placeholder="Leave blank to use active board"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleSeed()}
                className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Seed board
              </button>
              <button
                type="button"
                onClick={() => handleAssemble()}
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700"
              >
                View assembly
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700"
              >
                Sign out
              </button>
            </div>
            {status && (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                {status}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Your boards</h2>
              <p className="text-xs text-zinc-500">Only boards you created.</p>
            </div>
            <button
              type="button"
              onClick={() => loadBoards().catch(() => undefined)}
              className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
            >
              Refresh
            </button>
          </div>
          <div className="mt-4 grid gap-3">
            {boards.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200 p-4 text-xs text-zinc-500">
                No boards yet.
              </div>
            ) : (
              boards.map((board) => (
                <div
                  key={board.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold">{board.name}</p>
                    <p className="text-xs text-zinc-500">
                        Size: {board.size} × {board.size} · Created {new Date(board.createdAt).toLocaleString()}
                    </p>
                      <p className="text-xs text-zinc-400">
                        Status: {board.active ? "Public" : "Private"}
                      </p>
                    <p className="text-xs text-zinc-400">ID: {board.id}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBoardId(board.id)}
                      className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700"
                    >
                      Select
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSeed(board.id)}
                      className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700"
                    >
                      Seed
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAssemble(board.id)}
                      className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700"
                    >
                      Assemble
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBoard(board.id)}
                      className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTogglePublish(board.id, !board.active)}
                      className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700"
                    >
                      {board.active ? "Unpublish" : "Publish"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

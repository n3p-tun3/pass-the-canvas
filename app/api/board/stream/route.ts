import { boardEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const boardId = searchParams.get("boardId");

  let onUpdate: ((payload: { boardId: string }) => void) | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(`data: ${JSON.stringify(payload)}\n\n`);
      };

      onUpdate = (payload: { boardId: string }) => {
        if (!boardId || payload.boardId === boardId) {
          send(payload);
        }
      };

      boardEvents.on("update", onUpdate);
      send({ type: "connected" });

      pingTimer = setInterval(() => {
        controller.enqueue("event: ping\ndata: {}\n\n");
      }, 20000);
    },
    cancel() {
      if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
      }
      if (onUpdate) {
        boardEvents.off("update", onUpdate);
        onUpdate = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

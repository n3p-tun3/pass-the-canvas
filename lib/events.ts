import { EventEmitter } from "events";

export type BoardUpdatePayload = {
  boardId: string;
  reason: "tiles" | "locks" | "presence";
};

const globalForBoardEvents = globalThis as unknown as {
  boardEvents?: EventEmitter;
};

export const boardEvents =
  globalForBoardEvents.boardEvents ?? new EventEmitter();

if (!globalForBoardEvents.boardEvents) {
  globalForBoardEvents.boardEvents = boardEvents;
}

export const emitBoardUpdate = (payload: BoardUpdatePayload) => {
  boardEvents.emit("update", payload);
};

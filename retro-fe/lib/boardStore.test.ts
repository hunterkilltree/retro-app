import { describe, it, expect, beforeEach } from "vitest";
import { useBoardStore } from "./boardStore";
import type { RoomSnapshotResponse } from "./types";

const sampleSnapshot: RoomSnapshotResponse = {
  participant: { id: "p1", username: "alice", color: "#b8820a", role: "ADMIN" },
  room: { id: "r1", roomCode: "ABC-12D", state: "SETUP", timerSeconds: 300, timerStartedAt: null },
  participants: [],
  columns: [],
  notes: [],
  groups: [],
  actionItems: [],
};

describe("useBoardStore", () => {
  beforeEach(() => useBoardStore.getState().clear());

  it("starts with a null snapshot", () => {
    expect(useBoardStore.getState().snapshot).toBeNull();
  });

  it("setSnapshot stores the snapshot", () => {
    useBoardStore.getState().setSnapshot(sampleSnapshot);
    expect(useBoardStore.getState().snapshot).toEqual(sampleSnapshot);
  });

  it("clear resets the snapshot back to null", () => {
    useBoardStore.getState().setSnapshot(sampleSnapshot);
    useBoardStore.getState().clear();
    expect(useBoardStore.getState().snapshot).toBeNull();
  });
});

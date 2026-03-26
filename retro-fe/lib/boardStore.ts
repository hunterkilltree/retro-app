import { create } from "zustand";
import type { RoomSnapshotResponse } from "./types";

type BoardStore = {
  snapshot: RoomSnapshotResponse | null;
  setSnapshot: (snapshot: RoomSnapshotResponse) => void;
  clear: () => void;
};

export const useBoardStore = create<BoardStore>((set) => ({
  snapshot: null,
  setSnapshot: (snapshot) => set({ snapshot }),
  clear: () => set({ snapshot: null }),
}));


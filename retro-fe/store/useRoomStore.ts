import { create } from "zustand";
import type {
  ActionItem,
  BoardColumn,
  BoardState,
  Note,
  NoteGroup,
  Participant,
  Room,
  RoomSnapshot,
} from "@/lib/types";

export interface RoomStore {
  room: Room | null;
  me: Participant | null;
  participants: Participant[];
  columns: BoardColumn[];
  notes: Note[];
  groups: NoteGroup[];
  actionItems: ActionItem[];

  setFullState: (snapshot: RoomSnapshot) => void;
  updateRoomState: (state: BoardState) => void;
  addParticipant: (p: Participant) => void;
  addColumn: (c: BoardColumn) => void;
  updateColumn: (c: BoardColumn) => void;
  deleteColumn: (columnId: string) => void;
  addNote: (n: Note) => void;
  updateNote: (n: Note) => void;
  deleteNote: (noteId: string) => void;
  addGroup: (g: NoteGroup) => void;
  updateGroup: (g: NoteGroup) => void;
  setNoteGroup: (noteId: string, groupId: string | null) => void;
  addActionItem: (a: ActionItem) => void;
  updateActionItem: (a: ActionItem) => void;
  deleteActionItem: (id: string) => void;
  setTimerStartedAt: (ts: string) => void;
}

function upsertById<T extends { id: string }>(items: T[], item: T): T[] {
  const idx = items.findIndex((x) => x.id === item.id);
  if (idx === -1) return [...items, item];
  return items.map((x) => (x.id === item.id ? item : x));
}

function deleteById<T extends { id: string }>(items: T[], id: string): T[] {
  return items.filter((x) => x.id !== id);
}

export const useRoomStore = create<RoomStore>((set) => ({
  room: null,
  me: null,
  participants: [],
  columns: [],
  notes: [],
  groups: [],
  actionItems: [],

  setFullState: (snapshot) =>
    set({
      room: snapshot.room,
      me: snapshot.participant,
      participants: snapshot.participants,
      columns: snapshot.columns,
      notes: snapshot.notes,
      groups: snapshot.groups,
      actionItems: snapshot.actionItems,
    }),

  updateRoomState: (state) =>
    set((s) => ({
      room: s.room ? { ...s.room, state } : s.room,
    })),

  addParticipant: (p) => set((s) => ({ participants: upsertById(s.participants, p) })),

  addColumn: (c) => set((s) => ({ columns: upsertById(s.columns, c) })),
  updateColumn: (c) => set((s) => ({ columns: upsertById(s.columns, c) })),
  deleteColumn: (columnId) =>
    set((s) => ({
      columns: deleteById(s.columns, columnId),
      notes: s.notes.filter((n) => n.columnId !== columnId),
      groups: s.groups.filter((g) => g.columnId !== columnId),
    })),

  addNote: (n) => set((s) => ({ notes: upsertById(s.notes, n) })),
  updateNote: (n) => set((s) => ({ notes: upsertById(s.notes, n) })),
  deleteNote: (noteId) => set((s) => ({ notes: deleteById(s.notes, noteId) })),

  addGroup: (g) => set((s) => ({ groups: upsertById(s.groups, g) })),
  updateGroup: (g) => set((s) => ({ groups: upsertById(s.groups, g) })),
  setNoteGroup: (noteId, groupId) =>
    set((s) => ({
      notes: s.notes.map((n) => (n.id === noteId ? { ...n, groupId } : n)),
    })),

  addActionItem: (a) => set((s) => ({ actionItems: upsertById(s.actionItems, a) })),
  updateActionItem: (a) => set((s) => ({ actionItems: upsertById(s.actionItems, a) })),
  deleteActionItem: (id) => set((s) => ({ actionItems: deleteById(s.actionItems, id) })),

  setTimerStartedAt: (ts) =>
    set((s) => ({
      room: s.room ? { ...s.room, timerStartedAt: ts } : s.room,
    })),
}));


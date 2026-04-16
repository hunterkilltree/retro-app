import { create } from "zustand";
import type {
  ActionItem,
  BoardColumn,
  BoardSnapshot,
  BoardState,
  Note,
  NoteGroup,
  Participant,
  Room,
  RoomSnapshot,
  SnapshotActionItem,
  SnapshotGroup,
  SnapshotNote,
} from "@/lib/types";

export interface RoomStore {
  room: Room | null;
  me: Participant | null;
  participants: Participant[];
  columns: BoardColumn[];
  notes: SnapshotNote[];
  groups: SnapshotGroup[];
  actionItems: SnapshotActionItem[];
  /** Epoch ms when the timer expires. null until session starts. */
  timerEndsAtMs: number | null;

  setFullState: (snapshot: RoomSnapshot) => void;
  /** Apply a board snapshot received over WebSocket — does NOT overwrite `me`. */
  applyBoardSnapshot: (snapshot: BoardSnapshot) => void;
  updateRoomState: (state: BoardState) => void;
  addParticipant: (p: Participant) => void;
  removeParticipant: (id: string) => void;
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
  clearRoom: () => void;
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
  timerEndsAtMs: null,

  setFullState: (snapshot) =>
    set({
      room: snapshot.room,
      me: snapshot.participant,
      participants: snapshot.participants,
      columns: snapshot.columns,
      // REST /me returns full Note shape; normalise to SnapshotNote
      notes: snapshot.notes.map((n) => ({
        id: n.id,
        columnId: n.columnId,
        participantId: n.participantId,
        groupId: n.groupId,
        content: n.content,
        position: n.position,
        authorName: n.authorName,
        authorColor: n.authorColor,
      })),
      groups: snapshot.groups.map((g) => ({
        id: g.id,
        columnId: g.columnId,
        name: g.name,
        position: g.position,
      })),
      actionItems: snapshot.actionItems.map((a) => ({
        id: a.id,
        content: a.content,
        position: a.position,
      })),
      timerEndsAtMs: null, // will be set by next WS snapshot
    }),

  applyBoardSnapshot: (snapshot) =>
    set({
      room: {
        id: snapshot.room.id,
        roomCode: snapshot.room.roomCode,
        state: snapshot.room.state,
        timerSeconds: snapshot.room.timerSeconds,
        timerStartedAt: null, // not used for display; timerEndsAtMs is used
      },
      participants: snapshot.participants,
      columns: snapshot.columns,
      notes: snapshot.notes,
      groups: snapshot.groups,
      actionItems: snapshot.actionItems,
      timerEndsAtMs: snapshot.room.timerEndsAtMs,
    }),

  updateRoomState: (state) =>
    set((s) => ({
      room: s.room ? { ...s.room, state } : s.room,
    })),

  addParticipant: (p) => set((s) => ({ participants: upsertById(s.participants, p) })),
  removeParticipant: (id) => set((s) => ({ participants: deleteById(s.participants, id) })),

  addColumn: (c) => set((s) => ({ columns: upsertById(s.columns, c) })),
  updateColumn: (c) => set((s) => ({ columns: upsertById(s.columns, c) })),
  deleteColumn: (columnId) =>
    set((s) => ({
      columns: deleteById(s.columns, columnId),
      notes: s.notes.filter((n) => n.columnId !== columnId),
      groups: s.groups.filter((g) => g.columnId !== columnId),
    })),

  addNote: (n) =>
    set((s) => ({
      notes: upsertById(s.notes, {
        id: n.id, columnId: n.columnId, participantId: n.participantId,
        groupId: n.groupId, content: n.content, position: n.position,
        authorName: n.authorName, authorColor: n.authorColor,
      }),
    })),
  updateNote: (n) =>
    set((s) => ({
      notes: upsertById(s.notes, {
        id: n.id, columnId: n.columnId, participantId: n.participantId,
        groupId: n.groupId, content: n.content, position: n.position,
        authorName: n.authorName, authorColor: n.authorColor,
      }),
    })),
  deleteNote: (noteId) => set((s) => ({ notes: deleteById(s.notes, noteId) })),

  addGroup: (g) =>
    set((s) => ({ groups: upsertById(s.groups, { id: g.id, columnId: g.columnId, name: g.name, position: g.position }) })),
  updateGroup: (g) =>
    set((s) => ({ groups: upsertById(s.groups, { id: g.id, columnId: g.columnId, name: g.name, position: g.position }) })),
  setNoteGroup: (noteId, groupId) =>
    set((s) => ({
      notes: s.notes.map((n) => (n.id === noteId ? { ...n, groupId } : n)),
    })),

  addActionItem: (a) =>
    set((s) => ({ actionItems: upsertById(s.actionItems, { id: a.id, content: a.content, position: a.position }) })),
  updateActionItem: (a) =>
    set((s) => ({ actionItems: upsertById(s.actionItems, { id: a.id, content: a.content, position: a.position }) })),
  deleteActionItem: (id) => set((s) => ({ actionItems: deleteById(s.actionItems, id) })),

  setTimerStartedAt: (ts) =>
    set((s) => ({
      room: s.room ? { ...s.room, timerStartedAt: ts } : s.room,
    })),

  clearRoom: () =>
    set({
      room: null,
      me: null,
      participants: [],
      columns: [],
      notes: [],
      groups: [],
      actionItems: [],
      timerEndsAtMs: null,
    }),
}));

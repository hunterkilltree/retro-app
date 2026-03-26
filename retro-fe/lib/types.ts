export type BoardState = "SETUP" | "START" | "REVIEW" | "DONE";
export type ParticipantRole = "ADMIN" | "GUEST";

export type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

export type Participant = { id: string; username: string; color: string; role: ParticipantRole };
export type Room = {
  id: string;
  roomCode: string;
  state: BoardState;
  timerSeconds: number;
  timerStartedAt?: string | null;
};
export type BoardColumn = { id: string; title: string; color: string; position: number };
export type Note = {
  id: string;
  columnId: string;
  participantId: string;
  groupId: string | null;
  content: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  authorName: string;
  authorColor: string;
};
export type NoteGroup = { id: string; columnId: string; name: string | null; position: number; createdAt: string };
export type ActionItem = { id: string; content: string; position: number; createdAt: string };

export type CreateRoomResponse = {
  id: string;
  roomCode: string;
  state: BoardState;
};

export type JoinRoomRequest = {
  username: string;
  color: string;
};

export type JoinRoomResponse = {
  sessionToken: string;
  participant: { id: string; username: string; color: string; role: ParticipantRole };
  room: { id: string; roomCode: string; state: BoardState; timerSeconds: number };
};

export type RoomSnapshotResponse = {
  participant: Participant;
  room: Room & { timerStartedAt: string | null };
  participants: Participant[];
  columns: BoardColumn[];
  notes: Note[];
  groups: NoteGroup[];
  actionItems: ActionItem[];
};

export type RoomSnapshot = RoomSnapshotResponse;


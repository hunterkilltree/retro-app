"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useRoomStore } from "@/store/useRoomStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import { TopBar } from "@/components/ui/TopBar";
import { SetupScreen } from "@/components/admin/SetupScreen";
import { StartBoard } from "@/components/board/StartBoard";
import { ReviewBoard } from "@/components/board/ReviewBoard";
import type { ApiResponse, JoinRoomRequest, JoinRoomResponse, RoomSnapshotResponse } from "@/lib/types";

const COLORS = [
  "#4caf80", "#7c6af5", "#e8b86d", "#e06060",
  "#5bc4d4", "#e07a5f", "#3d7ebf", "#c97db5",
] as const;

const LS_TOKEN_KEY = "session_token";
const LS_ROOM_KEY  = "room_code";

function Spinner({ size = 24 }: { size?: number }) {
  return (
    <span
      style={{ width: size, height: size }}
      className="inline-block animate-spin rounded-full border-2 border-current/20 border-t-current"
      aria-hidden="true"
    />
  );
}

// ─── Board view — shown after joining ────────────────────────────────────────
function BoardView({ roomCode, sessionToken }: { roomCode: string; sessionToken: string }) {
  const room         = useRoomStore((s) => s.room);
  const me           = useRoomStore((s) => s.me);
  const participants = useRoomStore((s) => s.participants);
  const columns      = useRoomStore((s) => s.columns);
  const notes        = useRoomStore((s) => s.notes);
  const groups       = useRoomStore((s) => s.groups);
  const timerEndsAtMs = useRoomStore((s) => s.timerEndsAtMs);

  const { status, sendMessage } = useWebSocket(roomCode, sessionToken);
  const [isStarting, setIsStarting] = useState(false);

  function handleStartSession() {
    setIsStarting(true);
    sendMessage(`/app/room/${roomCode}/advanceState`);
    setTimeout(() => setIsStarting(false), 2000);
  }

  function handleAddNote(columnId: string, content: string) {
    sendMessage(`/app/room/${roomCode}/addNote`, { columnId, content });
  }

  function handleEditNote(noteId: string, content: string) {
    sendMessage(`/app/room/${roomCode}/editNote`, { noteId, content });
  }

  function handleDeleteNote(noteId: string) {
    sendMessage(`/app/room/${roomCode}/deleteNote`, { noteId });
  }

  function handleMoveToReview() {
    sendMessage(`/app/room/${roomCode}/advanceState`);
  }

  function handleGroupNotes(draggedNoteId: string, targetNoteId: string) {
    sendMessage(`/app/room/${roomCode}/groupNotes`, { draggedNoteId, targetNoteId });
  }

  function handleMoveToDone() {
    sendMessage(`/app/room/${roomCode}/advanceState`);
  }

  if (!room || !me) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--bg)" }}>
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <TopBar roomCode={roomCode} state={room.state} me={me} />

      {/* WS reconnecting banner */}
      {status === "reconnecting" && (
        <div
          style={{
            background: "var(--accent)",
            color: "#fff",
            textAlign: "center",
            padding: "6px",
            fontSize: "0.8rem",
            fontWeight: 600,
          }}
        >
          Reconnecting…
        </div>
      )}

      {/* Board state views */}
      {room.state === "SETUP" && me.role === "ADMIN" && (
        <SetupScreen
          roomCode={roomCode}
          sessionToken={sessionToken}
          columns={columns}
          timerSeconds={room.timerSeconds}
          participants={participants}
          onStartSession={handleStartSession}
          isStarting={isStarting}
        />
      )}

      {room.state === "SETUP" && me.role === "GUEST" && (
        <GuestSetupWaiting participants={participants} />
      )}

      {room.state === "START" && me && (
        <StartBoard
          columns={columns}
          notes={notes}
          me={me}
          timerEndsAtMs={timerEndsAtMs}
          totalSeconds={room.timerSeconds}
          onAddNote={handleAddNote}
          onEditNote={handleEditNote}
          onDeleteNote={handleDeleteNote}
          onMoveToReview={handleMoveToReview}
        />
      )}

      {room.state === "REVIEW" && me && (
        <ReviewBoard
          columns={columns}
          notes={notes}
          groups={groups}
          me={me}
          onGroupNotes={handleGroupNotes}
          onMoveToDone={handleMoveToDone}
        />
      )}

      {room.state === "DONE" && (
        <StatePlaceholder label="Session Done" description="Review the summary and action items." />
      )}
    </div>
  );
}

function GuestSetupWaiting({ participants }: { participants: { id: string; username: string; color: string; role: string }[] }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 px-6 py-16">
      <div
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "1.4rem",
          color: "var(--text)",
          textAlign: "center",
        }}
      >
        Waiting for admin to start…
      </div>
      <Spinner size={28} />
      <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
        {participants.length} participant{participants.length !== 1 ? "s" : ""} in the room
      </div>
    </div>
  );
}

function StatePlaceholder({ label, description }: { label: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16">
      <div
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "1.4rem",
          color: "var(--text)",
          textAlign: "center",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "0.87rem", color: "var(--text-muted)" }}>{description}</div>
    </div>
  );
}

// ─── Gate — join form ─────────────────────────────────────────────────────────
export default function RoomGatePage() {
  const params   = useParams<{ roomCode: string }>();
  const roomCode = (params.roomCode ?? "").toString();

  const setFullState = useRoomStore((s) => s.setFullState);
  const room         = useRoomStore((s) => s.room);

  const [phase, setPhase]       = useState<"checking" | "join" | "board">("checking");
  const [token, setToken]       = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [name, setName]         = useState("");
  const [color, setColor]       = useState<(typeof COLORS)[number]>(COLORS[0]);
  const [submitting, setSubmitting] = useState(false);

  const normalizedRoomCode = useMemo(() => roomCode.trim().toUpperCase(), [roomCode]);

  // Try to reconnect from localStorage
  useEffect(() => {
    let cancelled = false;

    async function run() {
      setError(null);
      const storedToken = localStorage.getItem(LS_TOKEN_KEY);
      const storedRoom  = localStorage.getItem(LS_ROOM_KEY);

      if (!storedToken || !storedRoom || storedRoom !== normalizedRoomCode) {
        if (!cancelled) setPhase("join");
        return;
      }

      try {
        const res  = await fetch(`/api/rooms/${encodeURIComponent(normalizedRoomCode)}/me`, {
          headers: { "X-Session-Token": storedToken },
        });
        const json = (await res.json()) as ApiResponse<RoomSnapshotResponse>;

        if (res.ok && json.success) {
          setFullState(json.data);
          if (!cancelled) { setToken(storedToken); setPhase("board"); }
          return;
        }

        if (res.status === 401 || res.status === 404) {
          localStorage.removeItem(LS_TOKEN_KEY);
          localStorage.removeItem(LS_ROOM_KEY);
          if (!cancelled) setPhase("join");
          return;
        }

        throw new Error(!json.success ? json.error : "Failed to reconnect");
      } catch (e) {
        if (!cancelled) { setError(e instanceof Error ? e.message : "Failed to reconnect"); setPhase("join"); }
      }
    }

    run();
    return () => { cancelled = true; };
  }, [normalizedRoomCode, setFullState]);

  async function onJoin() {
    if (submitting) return;
    setError(null);

    const trimmed = name.trim();
    if (!trimmed)            { setError("Your name is required."); return; }
    if (trimmed.length > 30) { setError("Name must be 30 characters or less."); return; }

    setSubmitting(true);
    try {
      const payload: JoinRoomRequest = { username: trimmed, color };
      const res  = await fetch(`/api/rooms/${encodeURIComponent(normalizedRoomCode)}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as ApiResponse<JoinRoomResponse>;

      if (!res.ok || !json.success) throw new Error(!json.success ? json.error : "Failed to join room");

      const sessionToken = json.data.sessionToken;
      localStorage.setItem(LS_TOKEN_KEY, sessionToken);
      localStorage.setItem(LS_ROOM_KEY, normalizedRoomCode);

      const meRes  = await fetch(`/api/rooms/${encodeURIComponent(normalizedRoomCode)}/me`, {
        headers: { "X-Session-Token": sessionToken },
      });
      const meJson = (await meRes.json()) as ApiResponse<RoomSnapshotResponse>;
      if (!meRes.ok || !meJson.success) throw new Error(!meJson.success ? meJson.error : "Joined, but failed to load room");

      setFullState(meJson.data);
      setToken(sessionToken);
      setPhase("board");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join room");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Checking ──
  if (phase === "checking") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center" style={{ background: "var(--bg)" }}>
        <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem", color: "var(--text)", marginBottom: 8 }}>
          Retro
        </div>
        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 16 }}>
          Loading room {normalizedRoomCode}…
        </div>
        <Spinner size={32} />
      </div>
    );
  }

  // ── Board ──
  if (phase === "board" && token) {
    return <BoardView roomCode={normalizedRoomCode} sessionToken={token} />;
  }

  // ── Join form ──
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6" style={{ background: "var(--bg)" }}>
      <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem", color: "var(--text)", marginBottom: 4 }}>
        Retro
      </div>
      <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Join room</div>
      <div style={{ fontFamily: "var(--font-serif)", fontSize: "2rem", color: "var(--text)", margin: "4px 0 24px" }}>
        {normalizedRoomCode}
      </div>

      <div style={{ width: "100%", maxWidth: 360, textAlign: "left" }}>
        <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)" }}>
          Your name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onJoin()}
          maxLength={30}
          placeholder="Sara"
          style={{
            display: "block",
            width: "100%",
            marginTop: 6,
            height: 42,
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text)",
            padding: "0 12px",
            fontSize: "0.9rem",
            outline: "none",
          }}
        />

        <div style={{ marginTop: 18, fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)" }}>
          Pick a color
        </div>
        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 6 }}>
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              style={{
                width: "100%",
                aspectRatio: "1",
                borderRadius: "50%",
                border: c === color ? "3px solid var(--text)" : "2px solid transparent",
                backgroundColor: c,
                cursor: "pointer",
              }}
              aria-label={`Select color ${c}`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={onJoin}
          disabled={submitting}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            width: "100%",
            height: 46,
            marginTop: 22,
            borderRadius: 8,
            border: "none",
            background: "var(--accent2)",
            color: "#fff",
            fontSize: "0.9rem",
            fontWeight: 700,
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting && <Spinner size={16} />}
          {submitting ? "Joining…" : "Join Room"}
        </button>

        {error && (
          <div
            style={{
              marginTop: 10,
              padding: "8px 12px",
              borderRadius: 6,
              background: "rgba(201,64,64,0.1)",
              border: "1px solid rgba(201,64,64,0.3)",
              color: "var(--red)",
              fontSize: "0.83rem",
            }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

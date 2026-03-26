"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useRoomStore } from "@/store/useRoomStore";
import type { ApiResponse, JoinRoomRequest, JoinRoomResponse, RoomSnapshotResponse } from "@/lib/types";

const COLORS = [
  "#4caf80",
  "#7c6af5",
  "#e8b86d",
  "#e06060",
  "#5bc4d4",
  "#e07a5f",
  "#3d7ebf",
  "#c97db5",
] as const;

const LS_TOKEN_KEY = "session_token";
const LS_ROOM_KEY = "room_code";

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-white"
      aria-hidden="true"
    />
  );
}

export default function RoomGatePage() {
  const params = useParams<{ roomCode: string }>();
  const roomCode = (params.roomCode ?? "").toString();

  const setFullState = useRoomStore((s) => s.setFullState);

  const [phase, setPhase] = useState<"checking" | "join">("checking");
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [color, setColor] = useState<(typeof COLORS)[number]>(COLORS[0]);
  const [submitting, setSubmitting] = useState(false);

  const normalizedRoomCode = useMemo(() => roomCode.trim().toUpperCase(), [roomCode]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setError(null);

      const storedToken = localStorage.getItem(LS_TOKEN_KEY);
      const storedRoom = localStorage.getItem(LS_ROOM_KEY);

      if (!storedToken || !storedRoom || storedRoom !== normalizedRoomCode) {
        if (!cancelled) setPhase("join");
        return;
      }

      try {
        const res = await fetch(`/api/rooms/${encodeURIComponent(normalizedRoomCode)}/me`, {
          method: "GET",
          headers: { "X-Session-Token": storedToken },
        });
        const json = (await res.json()) as ApiResponse<RoomSnapshotResponse>;

        if (res.ok && json.success) {
          setFullState(json.data);
          if (!cancelled) setPhase("checking"); // later story: route to board view
          return;
        }

        if (res.status === 401 || res.status === 404) {
          localStorage.removeItem(LS_TOKEN_KEY);
          localStorage.removeItem(LS_ROOM_KEY);
          if (!cancelled) setPhase("join");
          return;
        }

        const msg = json && !json.success ? json.error : "Failed to reconnect";
        throw new Error(msg);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to reconnect");
          setPhase("join");
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [normalizedRoomCode, setFullState]);

  async function onJoin() {
    if (submitting) return;
    setError(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Your name is required.");
      return;
    }
    if (trimmed.length > 30) {
      setError("Your name must be 30 characters or less.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: JoinRoomRequest = { username: trimmed, color };
      const res = await fetch(`/api/rooms/${encodeURIComponent(normalizedRoomCode)}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as ApiResponse<JoinRoomResponse>;

      if (!res.ok || !json.success) {
        const msg = json && !json.success ? json.error : "Failed to join room";
        throw new Error(msg);
      }

      localStorage.setItem(LS_TOKEN_KEY, json.data.sessionToken);
      localStorage.setItem(LS_ROOM_KEY, normalizedRoomCode);

      const meRes = await fetch(`/api/rooms/${encodeURIComponent(normalizedRoomCode)}/me`, {
        method: "GET",
        headers: { "X-Session-Token": json.data.sessionToken },
      });
      const meJson = (await meRes.json()) as ApiResponse<RoomSnapshotResponse>;
      if (!meRes.ok || !meJson.success) {
        const msg = meJson && !meJson.success ? meJson.error : "Joined, but failed to load room state";
        throw new Error(msg);
      }

      setFullState(meJson.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join room");
    } finally {
      setSubmitting(false);
    }
  }

  if (phase === "checking") {
    return (
      <div className="min-h-screen bg-[#FBF0D9]">
        <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
          <div className="mb-2 font-[var(--font-serif)] text-2xl tracking-tight text-zinc-900">Retro</div>
          <div className="text-sm text-zinc-700">Loading room {normalizedRoomCode}…</div>
          <div className="mt-4 h-10 w-10 animate-spin rounded-full border-2 border-zinc-900/20 border-t-zinc-900" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF0D9]">
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
        <div className="mb-2 font-[var(--font-serif)] text-2xl tracking-tight text-zinc-900">Retro</div>
        <div className="text-sm text-zinc-700">Join room</div>
        <div className="mt-1 font-[var(--font-serif)] text-3xl tracking-tight text-zinc-900">
          {normalizedRoomCode}
        </div>

        <div className="mt-8 w-full max-w-sm text-left">
          <label className="text-xs font-medium text-zinc-700">Your name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            placeholder="Sara"
            className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-3 text-sm text-zinc-900 shadow-sm outline-none focus:border-[#5a48d4]"
          />

          <div className="mt-5 text-xs font-medium text-zinc-700">Pick a color</div>
          <div className="mt-2 grid grid-cols-8 gap-2">
            {COLORS.map((c) => {
              const selected = c === color;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="relative h-8 w-8 rounded-full border border-black/10"
                  style={{ backgroundColor: c }}
                  aria-label={`Select color ${c}`}
                >
                  {selected ? (
                    <span className="absolute inset-0 grid place-items-center text-white text-sm font-bold">✓</span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onJoin}
            disabled={submitting}
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#5a48d4] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a3bc0] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? <Spinner /> : null}
            {submitting ? "Joining..." : "Join Room"}
          </button>

          {error ? (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}


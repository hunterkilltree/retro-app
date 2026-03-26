"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };
type CreateRoomResponse = { id: string; roomCode: string; state: "SETUP" | "START" | "REVIEW" | "DONE" };

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-white"
      aria-hidden="true"
    />
  );
}

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onGenerateRoom() {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/rooms", { method: "POST" });
      const json = (await res.json()) as ApiResponse<CreateRoomResponse>;

      if (!res.ok || !json.success) {
        const message =
          !json || (json as any).success === undefined
            ? "Unexpected server response"
            : json.success
              ? "Failed to generate room"
              : json.error || "Failed to generate room";
        throw new Error(message);
      }

      router.push(`/${json.data.roomCode}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FBF0D9]">
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 font-[var(--font-serif)] text-2xl tracking-tight text-zinc-900">
          Retro
        </div>

        <h1 className="text-balance font-[var(--font-serif)] text-4xl leading-tight tracking-tight text-zinc-900 sm:text-5xl">
          Run better retros, together.
        </h1>

        <p className="mt-4 max-w-md text-pretty text-base leading-7 text-zinc-700">
          No login. Generate a room, share the link, start reflecting.
        </p>

        <div className="mt-8 flex w-full max-w-sm flex-col items-stretch gap-3">
          <button
            type="button"
            onClick={onGenerateRoom}
            disabled={loading}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#b8820a] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#a57409] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? <Spinner /> : null}
            {loading ? "Generating..." : "Generate Room"}
          </button>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="text-xs text-zinc-600">No account required</div>
        </div>
      </main>
    </div>
  );
}

import { NextResponse } from "next/server";
import type { ApiResponse, JoinRoomResponse } from "@/lib/types";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8080";

export async function POST(req: Request, { params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = await params;
  try {
    const payload = await req.json();
    const res = await fetch(`${BACKEND}/api/rooms/${encodeURIComponent(roomCode)}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await res.json()) as ApiResponse<JoinRoomResponse>;
    return NextResponse.json(body, { status: res.status });
  } catch (e) {
    console.error("POST /api/rooms/[roomCode]/join failed:", e);
    return NextResponse.json({ success: false, error: "Backend unavailable" }, { status: 502 });
  }
}

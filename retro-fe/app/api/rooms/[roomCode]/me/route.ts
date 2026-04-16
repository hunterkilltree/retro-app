import { NextResponse } from "next/server";
import type { ApiResponse, RoomSnapshotResponse } from "@/lib/types";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8080";

export async function GET(req: Request, { params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = await params;
  const token = req.headers.get("x-session-token") ?? req.headers.get("X-Session-Token");
  try {
    const res = await fetch(`${BACKEND}/api/rooms/${encodeURIComponent(roomCode)}/me`, {
      method: "GET",
      headers: token ? { "X-Session-Token": token } : {},
    });
    const body = (await res.json()) as ApiResponse<RoomSnapshotResponse>;
    return NextResponse.json(body, { status: res.status });
  } catch (e) {
    console.error("GET /api/rooms/[roomCode]/me failed:", e);
    return NextResponse.json({ success: false, error: "Backend unavailable" }, { status: 502 });
  }
}

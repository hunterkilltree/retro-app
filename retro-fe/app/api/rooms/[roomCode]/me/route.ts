import { NextResponse } from "next/server";
import type { ApiResponse, RoomSnapshotResponse } from "@/lib/types";

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL ?? "http://localhost:8080";

export async function GET(req: Request, { params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = await params;
  const token = req.headers.get("x-session-token") ?? req.headers.get("X-Session-Token");

  const res = await fetch(`${BACKEND_BASE_URL}/api/rooms/${encodeURIComponent(roomCode)}/me`, {
    method: "GET",
    headers: token ? { "X-Session-Token": token } : {},
  });

  const body = (await res.json()) as ApiResponse<RoomSnapshotResponse>;
  return NextResponse.json(body, { status: res.status });
}


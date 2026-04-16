import { NextResponse } from "next/server";
import type { ApiResponse, CreateRoomResponse } from "@/lib/types";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8080";

export async function POST() {
  try {
    const res = await fetch(`${BACKEND}/api/rooms`, { method: "POST" });
    const body = (await res.json()) as ApiResponse<CreateRoomResponse>;
    return NextResponse.json(body, { status: res.status });
  } catch (e) {
    console.error("POST /api/rooms failed:", e);
    return NextResponse.json({ success: false, error: "Backend unavailable" }, { status: 502 });
  }
}

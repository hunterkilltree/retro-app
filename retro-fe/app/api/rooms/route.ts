import { NextResponse } from "next/server";
import type { ApiResponse, CreateRoomResponse } from "@/lib/types";

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL ?? "http://localhost:8080";

export async function POST() {
  const res = await fetch(`${BACKEND_BASE_URL}/api/rooms`, { method: "POST" });
  const body = (await res.json()) as ApiResponse<CreateRoomResponse>;
  return NextResponse.json(body, { status: res.status });
}


import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8080";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomCode: string; groupId: string }> }
) {
  const { roomCode, groupId } = await params;
  const token = req.headers.get("X-Session-Token") ?? "";

  const res = await fetch(
    `${BACKEND}/api/rooms/${encodeURIComponent(roomCode)}/groups/${encodeURIComponent(groupId)}/suggest-title`,
    {
      method: "POST",
      headers: { "X-Session-Token": token },
    }
  );

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

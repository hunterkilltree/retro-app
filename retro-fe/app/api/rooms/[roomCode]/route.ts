import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;
  const sessionToken = req.headers.get("X-Session-Token") ?? "";

  try {
    const res = await fetch(`${BACKEND_URL}/api/rooms/${roomCode}`, {
      method: "DELETE",
      headers: { "X-Session-Token": sessionToken },
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: "Backend unavailable" },
      { status: 502 }
    );
  }
}

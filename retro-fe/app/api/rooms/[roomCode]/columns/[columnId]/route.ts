import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8080";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ roomCode: string; columnId: string }> }
) {
  const { roomCode, columnId } = await params;
  const token = req.headers.get("X-Session-Token") ?? "";
  const body = await req.text();

  const res = await fetch(
    `${BACKEND}/api/rooms/${encodeURIComponent(roomCode)}/columns/${encodeURIComponent(columnId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Session-Token": token },
      body,
    }
  );

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ roomCode: string; columnId: string }> }
) {
  const { roomCode, columnId } = await params;
  const token = req.headers.get("X-Session-Token") ?? "";

  const res = await fetch(
    `${BACKEND}/api/rooms/${encodeURIComponent(roomCode)}/columns/${encodeURIComponent(columnId)}`,
    {
      method: "DELETE",
      headers: { "X-Session-Token": token },
    }
  );

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

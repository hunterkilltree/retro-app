import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8080";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;
  const token = req.headers.get("X-Session-Token") ?? "";

  const upstream = await fetch(
    `${BACKEND}/api/rooms/${encodeURIComponent(roomCode)}/export/pdf`,
    { headers: { "X-Session-Token": token } }
  );

  if (!upstream.ok) {
    return NextResponse.json({ success: false, error: "Export failed" }, { status: upstream.status });
  }

  const pdf = await upstream.arrayBuffer();
  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="retro-${roomCode}.pdf"`,
    },
  });
}

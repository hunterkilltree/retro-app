import { NextResponse } from "next/server";

// Exposes server-side env vars to the browser safely.
// Only non-secret values should be returned here.
export async function GET() {
  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
  return NextResponse.json({
    wsUrl: `${backendUrl}/ws`,
  });
}

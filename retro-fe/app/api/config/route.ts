import { NextResponse } from "next/server";

// Exposes server-side env vars to the browser safely.
// Only non-secret values should be returned here.
export async function GET() {
  // Server-side proxy target (reachable from inside the container/network),
  // e.g. http://backend:8080 in docker compose.
  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";

  // Browser-facing WebSocket origin. The browser can't resolve internal docker
  // service names, so this can be overridden with a host-reachable URL
  // (e.g. http://localhost:8080). Falls back to BACKEND_URL for local dev.
  const publicWsBase = process.env.PUBLIC_WS_URL ?? backendUrl;

  return NextResponse.json({
    wsUrl: `${publicWsBase}/ws`,
  });
}

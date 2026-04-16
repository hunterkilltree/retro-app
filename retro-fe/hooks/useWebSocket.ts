"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { useRoomStore } from "@/store/useRoomStore";
import type { BoardSnapshot } from "@/lib/types";

const BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];

export type WsStatus = "connecting" | "connected" | "reconnecting" | "disconnected";

// Fetch the WS URL from the server at runtime so BACKEND_URL env var
// doesn't need to be baked in at build time.
async function fetchWsUrl(): Promise<string> {
  try {
    const res = await fetch("/api/config");
    const data = await res.json();
    return data.wsUrl ?? "http://localhost:8080/ws";
  } catch {
    return "http://localhost:8080/ws";
  }
}

export function useWebSocket(roomCode: string, sessionToken: string | null) {
  const applyBoardSnapshot = useRoomStore((s) => s.applyBoardSnapshot);
  const clearRoom = useRoomStore((s) => s.clearRoom);
  const router = useRouter();
  const clientRef = useRef<Client | null>(null);
  const retryCountRef = useRef(0);
  const [status, setStatus] = useState<WsStatus>("connecting");

  const connect = useCallback(async () => {
    if (!sessionToken || !roomCode) return;

    const wsUrl = await fetchWsUrl();

    const client = new Client({
      webSocketFactory: () => new SockJS(wsUrl) as WebSocket,
      connectHeaders: { "X-Session-Token": sessionToken },
      reconnectDelay: 0,

      onConnect: () => {
        retryCountRef.current = 0;
        setStatus("connected");
        client.subscribe(`/topic/room/${roomCode}`, (msg) => {
          try {
            const data = JSON.parse(msg.body);
            if (data?.type === "ROOM_CLOSED") {
              // Admin deleted the room — clear store and send everyone home
              clientRef.current?.deactivate();
              localStorage.removeItem("session_token");
              localStorage.removeItem("room_code");
              clearRoom();
              router.push("/");
              return;
            }
            applyBoardSnapshot(data as BoardSnapshot);
          } catch {
            // ignore malformed messages
          }
        });
      },

      onDisconnect: () => {
        setStatus("reconnecting");
        const delay =
          BACKOFF_DELAYS[Math.min(retryCountRef.current, BACKOFF_DELAYS.length - 1)];
        retryCountRef.current++;
        setTimeout(() => {
          if (clientRef.current) clientRef.current.activate();
        }, delay);
      },

      onStompError: (frame) => {
        console.error("STOMP error", frame);
      },
    });

    clientRef.current = client;
    client.activate();
  }, [roomCode, sessionToken, applyBoardSnapshot, clearRoom, router]);

  useEffect(() => {
    connect();
    return () => {
      clientRef.current?.deactivate();
      clientRef.current = null;
    };
  }, [connect]);

  const sendMessage = useCallback(
    (destination: string, body?: unknown) => {
      clientRef.current?.publish({
        destination,
        body: body ? JSON.stringify(body) : "",
      });
    },
    []
  );

  return { status, sendMessage };
}

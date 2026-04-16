"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { useRoomStore } from "@/store/useRoomStore";
import type { BoardSnapshot } from "@/lib/types";

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:8080/ws";

const BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];

export type WsStatus = "connecting" | "connected" | "reconnecting" | "disconnected";

export function useWebSocket(roomCode: string, sessionToken: string | null) {
  const applyBoardSnapshot = useRoomStore((s) => s.applyBoardSnapshot);
  const clientRef = useRef<Client | null>(null);
  const retryCountRef = useRef(0);
  const [status, setStatus] = useState<WsStatus>("connecting");

  const connect = useCallback(() => {
    if (!sessionToken || !roomCode) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL) as WebSocket,
      connectHeaders: { "X-Session-Token": sessionToken },
      reconnectDelay: 0, // manual backoff below

      onConnect: () => {
        retryCountRef.current = 0;
        setStatus("connected");
        client.subscribe(`/topic/room/${roomCode}`, (msg) => {
          try {
            const snapshot = JSON.parse(msg.body) as BoardSnapshot;
            applyBoardSnapshot(snapshot);
          } catch {
            // ignore malformed messages
          }
        });
      },

      onDisconnect: () => {
        setStatus("reconnecting");
        const delay =
          BACKOFF_DELAYS[
            Math.min(retryCountRef.current, BACKOFF_DELAYS.length - 1)
          ];
        retryCountRef.current++;
        setTimeout(() => {
          if (clientRef.current) {
            clientRef.current.activate();
          }
        }, delay);
      },

      onStompError: (frame) => {
        console.error("STOMP error", frame);
      },
    });

    clientRef.current = client;
    client.activate();
  }, [roomCode, sessionToken, applyBoardSnapshot]);

  useEffect(() => {
    connect();
    return () => {
      clientRef.current?.deactivate();
      clientRef.current = null;
    };
  }, [connect]);

  /** Send a message to the server over STOMP. */
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

package com.retro.ws;

import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Tracks the mapping between WebSocket session IDs and participant session tokens.
 * Thread-safe — updated on STOMP CONNECT / DISCONNECT events.
 */
@Component
public class WebSocketSessionRegistry {

    private final ConcurrentHashMap<String, String> wsSessionToToken = new ConcurrentHashMap<>();

    public void register(String wsSessionId, String sessionToken) {
        wsSessionToToken.put(wsSessionId, sessionToken);
    }

    public Optional<String> getToken(String wsSessionId) {
        return Optional.ofNullable(wsSessionToToken.get(wsSessionId));
    }

    public void remove(String wsSessionId) {
        wsSessionToToken.remove(wsSessionId);
    }
}

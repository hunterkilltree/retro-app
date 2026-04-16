package com.retro.ws;

import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

/**
 * Intercepts the STOMP CONNECT frame to extract and store the
 * X-Session-Token header, mapping it to the WebSocket session ID.
 */
@Component
public class WebSocketChannelInterceptor implements ChannelInterceptor {

    private final WebSocketSessionRegistry registry;

    public WebSocketChannelInterceptor(WebSocketSessionRegistry registry) {
        this.registry = registry;
    }

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String sessionId = accessor.getSessionId();
            String token = accessor.getFirstNativeHeader("X-Session-Token");
            if (sessionId != null && token != null && !token.isBlank()) {
                registry.register(sessionId, token.trim());
            }
        }
        return message;
    }
}

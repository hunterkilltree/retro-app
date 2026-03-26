package com.retro.ws;

public record RoomEvent<T>(
        RoomEventType type,
        T data
) {}


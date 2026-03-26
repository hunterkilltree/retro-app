package com.retro.dto;

import com.retro.entity.enums.BoardState;
import com.retro.entity.enums.ParticipantRole;

import java.util.UUID;

public record JoinRoomResponse(
        String sessionToken,
        Participant participant,
        Room room
) {
    public record Participant(
            UUID id,
            String username,
            String color,
            ParticipantRole role
    ) {}

    public record Room(
            UUID id,
            String roomCode,
            BoardState state,
            Integer timerSeconds
    ) {}
}


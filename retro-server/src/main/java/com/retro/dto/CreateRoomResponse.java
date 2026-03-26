package com.retro.dto;

import com.retro.entity.enums.BoardState;

import java.util.UUID;

public record CreateRoomResponse(
        UUID id,
        String roomCode,
        BoardState state
) {}


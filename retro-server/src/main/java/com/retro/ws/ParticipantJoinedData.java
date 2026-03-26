package com.retro.ws;

import com.retro.entity.enums.ParticipantRole;

import java.util.UUID;

public record ParticipantJoinedData(
        UUID id,
        String username,
        String color,
        ParticipantRole role
) {}


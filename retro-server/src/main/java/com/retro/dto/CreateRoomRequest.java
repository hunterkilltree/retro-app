package com.retro.dto;

import jakarta.validation.constraints.Size;

/** Body of POST /api/rooms. All fields optional. */
public record CreateRoomRequest(
        @Size(max = 200) String geminiApiKey
) {}

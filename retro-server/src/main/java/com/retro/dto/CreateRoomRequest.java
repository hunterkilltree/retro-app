package com.retro.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Body of POST /api/rooms. All fields optional. */
public record CreateRoomRequest(
        @Size(max = 200) String geminiApiKey,
        @Size(max = 80) @Pattern(regexp = "^\\s*([A-Za-z0-9._-]+)?\\s*$", message = "Invalid Gemini model name")
        String geminiModel
) {}

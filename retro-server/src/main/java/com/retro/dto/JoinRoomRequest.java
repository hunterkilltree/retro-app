package com.retro.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record JoinRoomRequest(
        @NotBlank
        @Size(max = 50)
        String username,

        @NotBlank
        @Pattern(regexp = "^#[0-9a-fA-F]{6}$")
        String color
) {}


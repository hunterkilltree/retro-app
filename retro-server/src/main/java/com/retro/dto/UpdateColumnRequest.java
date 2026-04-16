package com.retro.dto;

import jakarta.validation.constraints.Size;

public record UpdateColumnRequest(
        @Size(max = 60) String title,
        String color,
        Integer position
) {}

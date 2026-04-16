package com.retro.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AddColumnRequest(
        @NotBlank @Size(max = 60) String title,
        @NotBlank String color
) {}

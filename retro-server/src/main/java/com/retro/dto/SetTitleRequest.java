package com.retro.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SetTitleRequest(
        @NotBlank @Size(max = 120) String title
) {}

package com.retro.dto;

import jakarta.validation.constraints.NotNull;

public record SetTimerRequest(
        @NotNull Integer timerSeconds
) {}

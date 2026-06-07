package com.retro.dto;

import jakarta.validation.constraints.NotNull;

public record SetVotesRequest(
        @NotNull Integer votesPerUser
) {}

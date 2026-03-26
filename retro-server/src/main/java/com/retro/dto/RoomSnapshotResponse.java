package com.retro.dto;

import com.retro.entity.enums.BoardState;
import com.retro.entity.enums.ParticipantRole;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record RoomSnapshotResponse(
        Participant participant,
        Room room,
        List<ParticipantSummary> participants,
        List<Column> columns,
        List<Note> notes,
        List<Group> groups,
        List<ActionItem> actionItems
) {
    public record Participant(
            UUID id,
            String username,
            String color,
            ParticipantRole role
    ) {}

    public record Room(
            UUID id,
            String roomCode,
            BoardState state,
            Integer timerSeconds,
            LocalDateTime timerStartedAt
    ) {}

    public record ParticipantSummary(
            UUID id,
            String username,
            String color,
            ParticipantRole role
    ) {}

    public record Column(
            UUID id,
            String title,
            String color,
            Integer position
    ) {}

    public record Note(
            UUID id,
            UUID columnId,
            UUID participantId,
            UUID groupId,
            String content,
            Integer position,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            String authorName,
            String authorColor
    ) {}

    public record Group(
            UUID id,
            UUID columnId,
            String name,
            Integer position,
            LocalDateTime createdAt
    ) {}

    public record ActionItem(
            UUID id,
            String content,
            Integer position,
            LocalDateTime createdAt
    ) {}
}


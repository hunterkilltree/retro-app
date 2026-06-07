package com.retro.dto;

import com.retro.entity.enums.BoardState;
import com.retro.entity.enums.ParticipantRole;

import java.util.List;
import java.util.UUID;

/**
 * Full board state broadcast to all connected clients via WebSocket.
 * Does NOT include the personal "me" participant — clients identify
 * themselves from the session token they stored at join time.
 */
public record BoardSnapshotMessage(
        Room room,
        List<ParticipantSummary> participants,
        List<Column> columns,
        List<Note> notes,
        List<Group> groups,
        List<ActionItem> actionItems,
        List<Vote> votes
) {
    /**
     * Room metadata. Uses timerEndsAtMs (epoch ms) so clients can compute
     * countdown without timezone ambiguity.
     */
    public record Room(
            UUID id,
            String roomCode,
            BoardState state,
            Integer timerSeconds,
            Long timerEndsAtMs,   // null until state = START and timer is running
            Integer votesPerUser  // null until the host sets it in SETUP
    ) {}

    public record ParticipantSummary(UUID id, String username, String color, ParticipantRole role) {}

    public record Column(UUID id, String title, String color, Integer position) {}

    public record Note(
            UUID id,
            UUID columnId,
            UUID participantId,
            UUID groupId,
            String content,
            Integer position,
            String authorName,
            String authorColor
    ) {}

    public record Group(UUID id, UUID columnId, String name, Integer position) {}

    public record ActionItem(UUID id, String content, Integer position) {}

    /** One vote cast by a participant on a note (at most one per note per participant). */
    public record Vote(UUID noteId, UUID participantId) {}
}

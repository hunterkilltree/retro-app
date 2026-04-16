package com.retro.service;

import com.retro.dto.BoardSnapshotMessage;
import com.retro.dto.RoomSnapshotResponse;
import com.retro.entity.*;
import com.retro.entity.enums.BoardState;
import com.retro.exception.InvalidStateTransitionException;
import com.retro.repository.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;

import java.util.List;

@Service
public class RoomService {

    private final ParticipantRepository participantRepository;
    private final BoardColumnRepository boardColumnRepository;
    private final NoteRepository noteRepository;
    private final NoteGroupRepository noteGroupRepository;
    private final ActionItemRepository actionItemRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public RoomService(
            ParticipantRepository participantRepository,
            BoardColumnRepository boardColumnRepository,
            NoteRepository noteRepository,
            NoteGroupRepository noteGroupRepository,
            ActionItemRepository actionItemRepository,
            SimpMessagingTemplate messagingTemplate
    ) {
        this.participantRepository = participantRepository;
        this.boardColumnRepository = boardColumnRepository;
        this.noteRepository = noteRepository;
        this.noteGroupRepository = noteGroupRepository;
        this.actionItemRepository = actionItemRepository;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Build a full board snapshot for broadcast. Does not include the personal
     * "me" participant — each client identifies themselves from their stored token.
     */
    @Transactional(readOnly = true)
    public BoardSnapshotMessage buildSnapshot(Room room) {
        List<Participant> participants = participantRepository.findByRoom(room);
        List<BoardColumn> columns = boardColumnRepository.findByRoomOrderByPosition(room);
        List<NoteGroup> groups = noteGroupRepository.findSnapshotGroupsByRoom(room);
        List<Note> notes = noteRepository.findSnapshotNotesByRoom(room);
        List<ActionItem> actionItems = actionItemRepository.findByRoomOrderByPosition(room);

        // Compute absolute epoch-ms deadline so clients don't need timezone math
        Long timerEndsAtMs = null;
        if (room.getTimerStartedAt() != null) {
            timerEndsAtMs = room.getTimerStartedAt()
                    .atZone(ZoneId.systemDefault())
                    .toInstant()
                    .toEpochMilli()
                    + (room.getTimerSeconds() * 1000L);
        }

        return new BoardSnapshotMessage(
                new BoardSnapshotMessage.Room(
                        room.getId(),
                        room.getRoomCode(),
                        room.getState(),
                        room.getTimerSeconds(),
                        timerEndsAtMs
                ),
                participants.stream()
                        .map(p -> new BoardSnapshotMessage.ParticipantSummary(
                                p.getId(), p.getUsername(), p.getColor(), p.getRole()))
                        .toList(),
                columns.stream()
                        .map(c -> new BoardSnapshotMessage.Column(
                                c.getId(), c.getTitle(), c.getColor(), c.getPosition()))
                        .toList(),
                notes.stream()
                        .map(n -> new BoardSnapshotMessage.Note(
                                n.getId(),
                                n.getColumn().getId(),
                                n.getParticipant().getId(),
                                n.getGroup() != null ? n.getGroup().getId() : null,
                                n.getContent(),
                                n.getPosition(),
                                n.getParticipant().getUsername(),
                                n.getParticipant().getColor()
                        ))
                        .toList(),
                groups.stream()
                        .map(g -> new BoardSnapshotMessage.Group(
                                g.getId(), g.getColumn().getId(), g.getName(), g.getPosition()))
                        .toList(),
                actionItems.stream()
                        .map(a -> new BoardSnapshotMessage.ActionItem(
                                a.getId(), a.getContent(), a.getPosition()))
                        .toList()
        );
    }

    /**
     * Broadcast the full board snapshot to all clients subscribed to the room topic.
     */
    public void broadcastSnapshot(Room room) {
        BoardSnapshotMessage snapshot = buildSnapshot(room);
        messagingTemplate.convertAndSend("/topic/room/" + room.getRoomCode(), snapshot);
    }

    /**
     * Broadcast a ROOM_CLOSED signal before deleting the room.
     * Clients receive this and redirect to the home page.
     */
    public void broadcastRoomClosed(Room room) {
        messagingTemplate.convertAndSend(
                "/topic/room/" + room.getRoomCode(),
                java.util.Map.of("type", "ROOM_CLOSED")
        );
    }

    /**
     * Validate and advance the board state (forward-only: SETUP→START→REVIEW→DONE).
     */
    public BoardState advanceState(Room room) {
        BoardState current = room.getState();
        BoardState next = switch (current) {
            case SETUP -> BoardState.START;
            case START -> BoardState.REVIEW;
            case REVIEW -> BoardState.DONE;
            case DONE -> throw new InvalidStateTransitionException("Room is already in DONE state");
        };
        room.setState(next);
        if (next == BoardState.START) {
            room.setTimerStartedAt(LocalDateTime.now());
        }
        return next;
    }
}

package com.retro.service;

import com.retro.dto.BoardSnapshotMessage;
import com.retro.entity.Room;
import com.retro.entity.enums.BoardState;
import com.retro.exception.InvalidStateTransitionException;
import com.retro.repository.ActionItemRepository;
import com.retro.repository.BoardColumnRepository;
import com.retro.repository.NoteGroupRepository;
import com.retro.repository.NoteRepository;
import com.retro.repository.ParticipantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RoomServiceTest {

    @Mock private ParticipantRepository participantRepository;
    @Mock private BoardColumnRepository boardColumnRepository;
    @Mock private NoteRepository noteRepository;
    @Mock private NoteGroupRepository noteGroupRepository;
    @Mock private ActionItemRepository actionItemRepository;
    @Mock private SimpMessagingTemplate messagingTemplate;

    private RoomService roomService;

    @BeforeEach
    void setUp() {
        roomService = new RoomService(
                participantRepository,
                boardColumnRepository,
                noteRepository,
                noteGroupRepository,
                actionItemRepository,
                messagingTemplate
        );
    }

    private Room roomInState(BoardState state) {
        return Room.builder()
                .id(UUID.randomUUID())
                .roomCode("ABC-12D")
                .state(state)
                .timerSeconds(300)
                .build();
    }

    // ── advanceState: forward-only state machine ─────────────────────────────

    @Test
    void advanceFromSetupGoesToStartAndStartsTimer() {
        Room room = roomInState(BoardState.SETUP);

        BoardState next = roomService.advanceState(room);

        assertThat(next).isEqualTo(BoardState.START);
        assertThat(room.getState()).isEqualTo(BoardState.START);
        assertThat(room.getTimerStartedAt())
                .as("entering START must stamp the timer start time")
                .isNotNull();
    }

    @Test
    void advanceFromStartGoesToReviewWithoutTouchingTimer() {
        Room room = roomInState(BoardState.START);

        BoardState next = roomService.advanceState(room);

        assertThat(next).isEqualTo(BoardState.REVIEW);
        assertThat(room.getState()).isEqualTo(BoardState.REVIEW);
    }

    @Test
    void advanceFromReviewGoesToDone() {
        Room room = roomInState(BoardState.REVIEW);

        BoardState next = roomService.advanceState(room);

        assertThat(next).isEqualTo(BoardState.DONE);
        assertThat(room.getState()).isEqualTo(BoardState.DONE);
    }

    @Test
    void advanceFromDoneIsRejected() {
        Room room = roomInState(BoardState.DONE);

        assertThatThrownBy(() -> roomService.advanceState(room))
                .isInstanceOf(InvalidStateTransitionException.class)
                .hasMessageContaining("DONE");

        assertThat(room.getState()).isEqualTo(BoardState.DONE);
    }

    // ── buildSnapshot: server-side timer math ────────────────────────────────

    @Test
    void snapshotHasNullDeadlineWhenTimerNotStarted() {
        Room room = roomInState(BoardState.SETUP);
        stubEmptyRepositories(room);

        BoardSnapshotMessage snapshot = roomService.buildSnapshot(room);

        assertThat(snapshot.room().timerEndsAtMs()).isNull();
        assertThat(snapshot.room().roomCode()).isEqualTo("ABC-12D");
        assertThat(snapshot.room().state()).isEqualTo(BoardState.SETUP);
    }

    @Test
    void snapshotComputesDeadlineAsStartPlusDuration() {
        Room room = roomInState(BoardState.START);
        LocalDateTime startedAt = LocalDateTime.of(2026, 6, 6, 10, 0, 0);
        room.setTimerStartedAt(startedAt);
        room.setTimerSeconds(300);
        stubEmptyRepositories(room);

        BoardSnapshotMessage snapshot = roomService.buildSnapshot(room);

        long expected = startedAt.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
                + 300_000L;
        assertThat(snapshot.room().timerEndsAtMs()).isEqualTo(expected);
    }

    // ── broadcasting ─────────────────────────────────────────────────────────

    @Test
    void broadcastSnapshotPublishesToRoomTopic() {
        Room room = roomInState(BoardState.START);
        stubEmptyRepositories(room);

        roomService.broadcastSnapshot(room);

        verify(messagingTemplate).convertAndSend(eq("/topic/room/ABC-12D"), any(BoardSnapshotMessage.class));
    }

    @Test
    void broadcastRoomClosedSendsRoomClosedSignal() {
        Room room = roomInState(BoardState.DONE);

        roomService.broadcastRoomClosed(room);

        ArgumentCaptor<Object> payload = ArgumentCaptor.forClass(Object.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/room/ABC-12D"), payload.capture());
        assertThat(payload.getValue()).asInstanceOf(org.assertj.core.api.InstanceOfAssertFactories.MAP)
                .containsEntry("type", "ROOM_CLOSED");
    }

    private void stubEmptyRepositories(Room room) {
        when(participantRepository.findByRoom(room)).thenReturn(List.of());
        when(boardColumnRepository.findByRoomOrderByPosition(room)).thenReturn(List.of());
        when(noteGroupRepository.findSnapshotGroupsByRoom(room)).thenReturn(List.of());
        when(noteRepository.findSnapshotNotesByRoom(room)).thenReturn(List.of());
        when(actionItemRepository.findByRoomOrderByPosition(room)).thenReturn(List.of());
    }
}

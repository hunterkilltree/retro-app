package com.retro.controller;

import com.retro.dto.ApiResponse;
import com.retro.dto.CreateRoomResponse;
import com.retro.dto.JoinRoomRequest;
import com.retro.dto.JoinRoomResponse;
import com.retro.dto.RoomSnapshotResponse;
import com.retro.entity.Participant;
import com.retro.entity.ActionItem;
import com.retro.entity.BoardColumn;
import com.retro.entity.Note;
import com.retro.entity.NoteGroup;
import com.retro.entity.Room;
import com.retro.entity.enums.BoardState;
import com.retro.entity.enums.ParticipantRole;
import com.retro.exception.RoomNotFoundException;
import com.retro.exception.UnauthorizedException;
import com.retro.repository.ActionItemRepository;
import com.retro.repository.BoardColumnRepository;
import com.retro.repository.NoteGroupRepository;
import com.retro.repository.NoteRepository;
import com.retro.repository.RoomRepository;
import com.retro.repository.ParticipantRepository;
import com.retro.util.RoomCodeGenerator;
import com.retro.ws.ParticipantJoinedData;
import com.retro.ws.RoomEvent;
import com.retro.ws.RoomEventType;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import java.util.List;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final RoomRepository roomRepository;
    private final ParticipantRepository participantRepository;
    private final BoardColumnRepository boardColumnRepository;
    private final NoteRepository noteRepository;
    private final NoteGroupRepository noteGroupRepository;
    private final ActionItemRepository actionItemRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public RoomController(
            RoomRepository roomRepository,
            ParticipantRepository participantRepository,
            BoardColumnRepository boardColumnRepository,
            NoteRepository noteRepository,
            NoteGroupRepository noteGroupRepository,
            ActionItemRepository actionItemRepository,
            SimpMessagingTemplate messagingTemplate
    ) {
        this.roomRepository = roomRepository;
        this.participantRepository = participantRepository;
        this.boardColumnRepository = boardColumnRepository;
        this.noteRepository = noteRepository;
        this.noteGroupRepository = noteGroupRepository;
        this.actionItemRepository = actionItemRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CreateRoomResponse>> createRoom() {
        String roomCode = null;
        for (int i = 0; i < 10; i++) {
            String candidate = RoomCodeGenerator.generate();
            Optional<Room> existing = roomRepository.findByRoomCode(candidate);
            if (existing.isEmpty()) {
                roomCode = candidate;
                break;
            }
        }

        if (roomCode == null) {
            throw new IllegalStateException("Unable to generate unique room code after 10 attempts");
        }

        Room room = Room.builder()
                .roomCode(roomCode)
                .state(BoardState.SETUP)
                .timerSeconds(300)
                .build();

        Room saved = roomRepository.save(room);
        CreateRoomResponse payload = new CreateRoomResponse(saved.getId(), saved.getRoomCode(), saved.getState());

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok(payload));
    }

    @PostMapping("/{roomCode}/join")
    public ResponseEntity<ApiResponse<JoinRoomResponse>> joinRoom(
            @PathVariable String roomCode,
            @Valid @RequestBody JoinRoomRequest body
    ) {
        String normalizedRoomCode = roomCode.trim().toUpperCase(Locale.ROOT);

        Room room = roomRepository.findByRoomCode(normalizedRoomCode)
                .orElseThrow(() -> new RoomNotFoundException(normalizedRoomCode));

        long participantCount = participantRepository.countByRoom(room);
        ParticipantRole role = (participantCount == 0) ? ParticipantRole.ADMIN : ParticipantRole.GUEST;

        String sessionToken = UUID.randomUUID().toString();
        Participant participant = Participant.builder()
                .room(room)
                .username(body.username().trim())
                .color(body.color())
                .role(role)
                .sessionToken(sessionToken)
                .build();

        Participant saved = participantRepository.save(participant);

        JoinRoomResponse payload = new JoinRoomResponse(
                sessionToken,
                new JoinRoomResponse.Participant(saved.getId(), saved.getUsername(), saved.getColor(), saved.getRole()),
                new JoinRoomResponse.Room(room.getId(), room.getRoomCode(), room.getState(), room.getTimerSeconds())
        );

        messagingTemplate.convertAndSend(
                "/topic/room/" + normalizedRoomCode,
                new RoomEvent<>(
                        RoomEventType.PARTICIPANT_JOINED,
                        new ParticipantJoinedData(saved.getId(), saved.getUsername(), saved.getColor(), saved.getRole())
                )
        );

        return ResponseEntity.ok(ApiResponse.ok(payload));
    }

    @GetMapping("/{roomCode}/me")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<RoomSnapshotResponse>> me(
            @PathVariable String roomCode,
            @RequestHeader(value = "X-Session-Token", required = false) String sessionTokenHeader
    ) {
        String normalizedRoomCode = roomCode.trim().toUpperCase(Locale.ROOT);

        if (sessionTokenHeader == null || sessionTokenHeader.isBlank()) {
            throw new UnauthorizedException("Missing X-Session-Token header");
        }

        Participant me = participantRepository.findWithRoomBySessionToken(sessionTokenHeader.trim())
                .orElseThrow(() -> new UnauthorizedException("Invalid session token"));

        Room room = me.getRoom();
        if (room == null || room.getRoomCode() == null || !room.getRoomCode().equals(normalizedRoomCode)) {
            throw new UnauthorizedException("Session token does not belong to this room");
        }

        List<Participant> participants = participantRepository.findByRoom(room);
        List<BoardColumn> columns = boardColumnRepository.findByRoomOrderByPosition(room);
        List<NoteGroup> groups = noteGroupRepository.findSnapshotGroupsByRoom(room);
        List<Note> notes = noteRepository.findSnapshotNotesByRoom(room);
        List<ActionItem> actionItems = actionItemRepository.findByRoomOrderByPosition(room);

        RoomSnapshotResponse payload = new RoomSnapshotResponse(
                new RoomSnapshotResponse.Participant(me.getId(), me.getUsername(), me.getColor(), me.getRole()),
                new RoomSnapshotResponse.Room(room.getId(), room.getRoomCode(), room.getState(), room.getTimerSeconds(), room.getTimerStartedAt()),
                participants.stream()
                        .map(p -> new RoomSnapshotResponse.ParticipantSummary(p.getId(), p.getUsername(), p.getColor(), p.getRole()))
                        .toList(),
                columns.stream()
                        .map(c -> new RoomSnapshotResponse.Column(c.getId(), c.getTitle(), c.getColor(), c.getPosition()))
                        .toList(),
                notes.stream()
                        .map(n -> new RoomSnapshotResponse.Note(
                                n.getId(),
                                n.getColumn().getId(),
                                n.getParticipant().getId(),
                                n.getGroup() != null ? n.getGroup().getId() : null,
                                n.getContent(),
                                n.getPosition(),
                                n.getCreatedAt(),
                                n.getUpdatedAt(),
                                n.getParticipant().getUsername(),
                                n.getParticipant().getColor()
                        ))
                        .toList(),
                groups.stream()
                        .map(g -> new RoomSnapshotResponse.Group(
                                g.getId(),
                                g.getColumn().getId(),
                                g.getName(),
                                g.getPosition(),
                                g.getCreatedAt()
                        ))
                        .toList(),
                actionItems.stream()
                        .map(a -> new RoomSnapshotResponse.ActionItem(a.getId(), a.getContent(), a.getPosition(), a.getCreatedAt()))
                        .toList()
        );

        return ResponseEntity.ok(ApiResponse.ok(payload));
    }
}


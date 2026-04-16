package com.retro.controller;

import com.retro.dto.AddColumnRequest;
import com.retro.dto.ApiResponse;
import com.retro.dto.CreateRoomResponse;
import com.retro.dto.JoinRoomRequest;
import com.retro.dto.JoinRoomResponse;
import com.retro.dto.RoomSnapshotResponse;
import com.retro.dto.SetTimerRequest;
import com.retro.dto.UpdateColumnRequest;
import com.retro.service.PdfExportService;
import com.retro.service.RoomService;
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
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
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
    private final RoomService roomService;
    private final PdfExportService pdfExportService;

    public RoomController(
            RoomRepository roomRepository,
            ParticipantRepository participantRepository,
            BoardColumnRepository boardColumnRepository,
            NoteRepository noteRepository,
            NoteGroupRepository noteGroupRepository,
            ActionItemRepository actionItemRepository,
            SimpMessagingTemplate messagingTemplate,
            RoomService roomService,
            PdfExportService pdfExportService
    ) {
        this.roomRepository = roomRepository;
        this.participantRepository = participantRepository;
        this.boardColumnRepository = boardColumnRepository;
        this.noteRepository = noteRepository;
        this.noteGroupRepository = noteGroupRepository;
        this.actionItemRepository = actionItemRepository;
        this.messagingTemplate = messagingTemplate;
        this.roomService = roomService;
        this.pdfExportService = pdfExportService;
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

    // ─────────────────────────────────────────────
    //  Column management (admin only, SETUP state)
    // ─────────────────────────────────────────────

    @PostMapping("/{roomCode}/columns")
    @Transactional
    public ResponseEntity<ApiResponse<RoomSnapshotResponse.Column>> addColumn(
            @PathVariable String roomCode,
            @RequestHeader("X-Session-Token") String sessionToken,
            @Valid @RequestBody AddColumnRequest body
    ) {
        String normalized = roomCode.trim().toUpperCase(Locale.ROOT);
        Room room = roomRepository.findByRoomCode(normalized)
                .orElseThrow(() -> new RoomNotFoundException(normalized));

        Participant admin = participantRepository.findWithRoomBySessionToken(sessionToken.trim())
                .filter(p -> p.getRoom().getId().equals(room.getId()))
                .filter(p -> p.getRole() == com.retro.entity.enums.ParticipantRole.ADMIN)
                .orElseThrow(() -> new UnauthorizedException("Only admin can add columns"));

        int nextPosition = boardColumnRepository.findByRoomOrderByPosition(room).size();

        BoardColumn column = new BoardColumn();
        column.setRoom(room);
        column.setTitle(body.title().trim());
        column.setColor(body.color());
        column.setPosition(nextPosition);
        BoardColumn saved = boardColumnRepository.save(column);

        roomService.broadcastSnapshot(room);

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                new RoomSnapshotResponse.Column(saved.getId(), saved.getTitle(), saved.getColor(), saved.getPosition())
        ));
    }

    @PatchMapping("/{roomCode}/columns/{columnId}")
    @Transactional
    public ResponseEntity<ApiResponse<RoomSnapshotResponse.Column>> updateColumn(
            @PathVariable String roomCode,
            @PathVariable UUID columnId,
            @RequestHeader("X-Session-Token") String sessionToken,
            @Valid @RequestBody UpdateColumnRequest body
    ) {
        String normalized = roomCode.trim().toUpperCase(Locale.ROOT);
        Room room = roomRepository.findByRoomCode(normalized)
                .orElseThrow(() -> new RoomNotFoundException(normalized));

        participantRepository.findWithRoomBySessionToken(sessionToken.trim())
                .filter(p -> p.getRoom().getId().equals(room.getId()))
                .filter(p -> p.getRole() == com.retro.entity.enums.ParticipantRole.ADMIN)
                .orElseThrow(() -> new UnauthorizedException("Only admin can update columns"));

        BoardColumn column = boardColumnRepository.findById(columnId)
                .filter(c -> c.getRoom().getId().equals(room.getId()))
                .orElseThrow(() -> new RoomNotFoundException("Column not found"));

        if (body.title() != null && !body.title().isBlank()) {
            column.setTitle(body.title().trim());
        }
        if (body.color() != null && !body.color().isBlank()) {
            column.setColor(body.color());
        }
        if (body.position() != null) {
            // Reorder: shift other columns to make room
            List<BoardColumn> allCols = boardColumnRepository.findByRoomOrderByPosition(room);
            allCols.remove(column);
            int clampedPos = Math.max(0, Math.min(body.position(), allCols.size()));
            allCols.add(clampedPos, column);
            for (int i = 0; i < allCols.size(); i++) {
                allCols.get(i).setPosition(i);
            }
            boardColumnRepository.saveAll(allCols);
        }

        BoardColumn saved = boardColumnRepository.save(column);
        roomService.broadcastSnapshot(room);

        return ResponseEntity.ok(ApiResponse.ok(
                new RoomSnapshotResponse.Column(saved.getId(), saved.getTitle(), saved.getColor(), saved.getPosition())
        ));
    }

    @DeleteMapping("/{roomCode}/columns/{columnId}")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> deleteColumn(
            @PathVariable String roomCode,
            @PathVariable UUID columnId,
            @RequestHeader("X-Session-Token") String sessionToken
    ) {
        String normalized = roomCode.trim().toUpperCase(Locale.ROOT);
        Room room = roomRepository.findByRoomCode(normalized)
                .orElseThrow(() -> new RoomNotFoundException(normalized));

        participantRepository.findWithRoomBySessionToken(sessionToken.trim())
                .filter(p -> p.getRoom().getId().equals(room.getId()))
                .filter(p -> p.getRole() == com.retro.entity.enums.ParticipantRole.ADMIN)
                .orElseThrow(() -> new UnauthorizedException("Only admin can delete columns"));

        BoardColumn column = boardColumnRepository.findById(columnId)
                .filter(c -> c.getRoom().getId().equals(room.getId()))
                .orElseThrow(() -> new RoomNotFoundException("Column not found"));

        boardColumnRepository.delete(column);

        // Re-index remaining columns
        List<BoardColumn> remaining = boardColumnRepository.findByRoomOrderByPosition(room);
        for (int i = 0; i < remaining.size(); i++) {
            remaining.get(i).setPosition(i);
        }
        boardColumnRepository.saveAll(remaining);

        roomService.broadcastSnapshot(room);

        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ─────────────────────────────────────────────
    //  Timer configuration (admin only, SETUP state)
    // ─────────────────────────────────────────────

    @PatchMapping("/{roomCode}/timer")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> setTimer(
            @PathVariable String roomCode,
            @RequestHeader("X-Session-Token") String sessionToken,
            @Valid @RequestBody SetTimerRequest body
    ) {
        String normalized = roomCode.trim().toUpperCase(Locale.ROOT);
        Room room = roomRepository.findByRoomCode(normalized)
                .orElseThrow(() -> new RoomNotFoundException(normalized));

        participantRepository.findWithRoomBySessionToken(sessionToken.trim())
                .filter(p -> p.getRoom().getId().equals(room.getId()))
                .filter(p -> p.getRole() == com.retro.entity.enums.ParticipantRole.ADMIN)
                .orElseThrow(() -> new UnauthorizedException("Only admin can set the timer"));

        // Only allow valid durations
        List<Integer> allowed = List.of(180, 300, 600, 900);
        if (!allowed.contains(body.timerSeconds())) {
            throw new IllegalArgumentException("Timer must be 180, 300, 600, or 900 seconds");
        }

        room.setTimerSeconds(body.timerSeconds());
        roomRepository.save(room);
        roomService.broadcastSnapshot(room);

        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ─── PDF export ───────────────────────────────────────────────────────────

    @GetMapping("/{roomCode}/export/pdf")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> exportPdf(
            @PathVariable String roomCode,
            @RequestHeader("X-Session-Token") String sessionToken
    ) {
        String normalized = roomCode.trim().toUpperCase(Locale.ROOT);
        Room room = roomRepository.findByRoomCode(normalized)
                .orElseThrow(() -> new RoomNotFoundException(normalized));

        participantRepository.findWithRoomBySessionToken(sessionToken.trim())
                .filter(p -> p.getRoom().getId().equals(room.getId()))
                .orElseThrow(() -> new UnauthorizedException("Must be a room participant to export"));

        try {
            byte[] pdf = pdfExportService.export(room);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "retro-" + normalized + ".pdf");
            return ResponseEntity.ok().headers(headers).body(pdf);
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF", e);
        }
    }

    // ─── Delete room ──────────────────────────────────────────────────────────

    @DeleteMapping("/{roomCode}")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> deleteRoom(
            @PathVariable String roomCode,
            @RequestHeader("X-Session-Token") String sessionToken
    ) {
        String normalized = roomCode.trim().toUpperCase(Locale.ROOT);
        Room room = roomRepository.findByRoomCode(normalized)
                .orElseThrow(() -> new RoomNotFoundException(normalized));

        participantRepository.findWithRoomBySessionToken(sessionToken.trim())
                .filter(p -> p.getRoom().getId().equals(room.getId()))
                .filter(p -> p.getRole() == com.retro.entity.enums.ParticipantRole.ADMIN)
                .orElseThrow(() -> new UnauthorizedException("Only admin can delete the room"));

        // Notify all connected clients before data is gone
        roomService.broadcastRoomClosed(room);

        // Delete in FK-safe order
        noteRepository.deleteAll(noteRepository.findSnapshotNotesByRoom(room));
        noteGroupRepository.deleteAll(noteGroupRepository.findSnapshotGroupsByRoom(room));
        actionItemRepository.deleteAll(actionItemRepository.findByRoomOrderByPosition(room));
        boardColumnRepository.deleteAll(boardColumnRepository.findByRoomOrderByPosition(room));
        participantRepository.deleteAll(participantRepository.findByRoom(room));
        roomRepository.delete(room);

        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}


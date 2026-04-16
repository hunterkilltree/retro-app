package com.retro.ws;

import com.retro.entity.BoardColumn;
import com.retro.entity.Note;
import com.retro.entity.Participant;
import com.retro.entity.Room;
import com.retro.entity.enums.BoardState;
import com.retro.entity.enums.ParticipantRole;
import com.retro.exception.InvalidStateTransitionException;
import com.retro.exception.RoomNotFoundException;
import com.retro.exception.UnauthorizedException;
import com.retro.repository.BoardColumnRepository;
import com.retro.repository.NoteRepository;
import com.retro.repository.ParticipantRepository;
import com.retro.repository.RoomRepository;
import com.retro.service.RoomService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Controller
public class RoomWsController {

    private static final Logger log = LoggerFactory.getLogger(RoomWsController.class);

    private final RoomRepository roomRepository;
    private final ParticipantRepository participantRepository;
    private final BoardColumnRepository boardColumnRepository;
    private final NoteRepository noteRepository;
    private final WebSocketSessionRegistry registry;
    private final RoomService roomService;

    public RoomWsController(
            RoomRepository roomRepository,
            ParticipantRepository participantRepository,
            BoardColumnRepository boardColumnRepository,
            NoteRepository noteRepository,
            WebSocketSessionRegistry registry,
            RoomService roomService
    ) {
        this.roomRepository = roomRepository;
        this.participantRepository = participantRepository;
        this.boardColumnRepository = boardColumnRepository;
        this.noteRepository = noteRepository;
        this.registry = registry;
        this.roomService = roomService;
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private Participant resolveParticipant(SimpMessageHeaderAccessor header, Room room) {
        String wsSessionId = header.getSessionId();
        String token = registry.getToken(wsSessionId)
                .orElseThrow(() -> new UnauthorizedException("No session token for WS session"));

        return participantRepository.findWithRoomBySessionToken(token)
                .filter(p -> p.getRoom().getId().equals(room.getId()))
                .orElseThrow(() -> new UnauthorizedException("Invalid session for this room"));
    }

    private Room resolveRoom(String roomCode) {
        String normalized = roomCode.trim().toUpperCase(Locale.ROOT);
        return roomRepository.findByRoomCode(normalized)
                .orElseThrow(() -> new RoomNotFoundException(normalized));
    }

    // ─── State advance ────────────────────────────────────────────────────────

    /** Admin advances board state: SETUP→START→REVIEW→DONE */
    @MessageMapping("/room/{roomCode}/advanceState")
    @Transactional
    public void advanceState(
            @DestinationVariable String roomCode,
            SimpMessageHeaderAccessor headerAccessor
    ) {
        Room room = resolveRoom(roomCode);
        Participant p = resolveParticipant(headerAccessor, room);

        if (p.getRole() != ParticipantRole.ADMIN) {
            throw new UnauthorizedException("Only admin can advance state");
        }

        try {
            roomService.advanceState(room);
            roomRepository.save(room);
            roomService.broadcastSnapshot(room);
            log.info("Room {} → {}", room.getRoomCode(), room.getState());
        } catch (InvalidStateTransitionException e) {
            log.warn("Invalid state transition for room {}: {}", room.getRoomCode(), e.getMessage());
        }
    }

    // ─── Note messages ────────────────────────────────────────────────────────

    record AddNotePayload(String columnId, String content) {}

    /** Any participant adds a note (state must be START). */
    @MessageMapping("/room/{roomCode}/addNote")
    @Transactional
    public void addNote(
            @DestinationVariable String roomCode,
            @Payload AddNotePayload payload,
            SimpMessageHeaderAccessor headerAccessor
    ) {
        Room room = resolveRoom(roomCode);
        Participant p = resolveParticipant(headerAccessor, room);

        if (room.getState() != BoardState.START) {
            log.warn("addNote rejected — room {} is in state {}", room.getRoomCode(), room.getState());
            return;
        }

        UUID columnId = UUID.fromString(payload.columnId());
        BoardColumn column = boardColumnRepository.findById(columnId)
                .filter(c -> c.getRoom().getId().equals(room.getId()))
                .orElseThrow(() -> new RoomNotFoundException("Column not found"));

        int position = noteRepository.findByColumnOrderByPosition(column).size();

        Note note = new Note();
        note.setRoom(room);
        note.setColumn(column);
        note.setParticipant(p);
        note.setContent(payload.content().trim());
        note.setPosition(position);
        noteRepository.save(note);

        roomService.broadcastSnapshot(room);
    }

    record EditNotePayload(String noteId, String content) {}

    /** Note author edits their own note (state must be START). */
    @MessageMapping("/room/{roomCode}/editNote")
    @Transactional
    public void editNote(
            @DestinationVariable String roomCode,
            @Payload EditNotePayload payload,
            SimpMessageHeaderAccessor headerAccessor
    ) {
        Room room = resolveRoom(roomCode);
        Participant p = resolveParticipant(headerAccessor, room);

        if (room.getState() != BoardState.START) return;

        UUID noteId = UUID.fromString(payload.noteId());
        Note note = noteRepository.findById(noteId)
                .filter(n -> n.getRoom().getId().equals(room.getId()))
                .orElseThrow(() -> new RoomNotFoundException("Note not found"));

        if (!note.getParticipant().getId().equals(p.getId())) {
            throw new UnauthorizedException("Only the note author can edit it");
        }

        note.setContent(payload.content().trim());
        noteRepository.save(note);
        roomService.broadcastSnapshot(room);
    }

    record DeleteNotePayload(String noteId) {}

    /** Note author deletes their own note (state must be START). */
    @MessageMapping("/room/{roomCode}/deleteNote")
    @Transactional
    public void deleteNote(
            @DestinationVariable String roomCode,
            @Payload DeleteNotePayload payload,
            SimpMessageHeaderAccessor headerAccessor
    ) {
        Room room = resolveRoom(roomCode);
        Participant p = resolveParticipant(headerAccessor, room);

        if (room.getState() != BoardState.START) return;

        UUID noteId = UUID.fromString(payload.noteId());
        Note note = noteRepository.findById(noteId)
                .filter(n -> n.getRoom().getId().equals(room.getId()))
                .orElseThrow(() -> new RoomNotFoundException("Note not found"));

        if (!note.getParticipant().getId().equals(p.getId())) {
            throw new UnauthorizedException("Only the note author can delete it");
        }

        BoardColumn column = note.getColumn();
        noteRepository.delete(note);

        // Re-index remaining notes in column
        List<Note> remaining = noteRepository.findByColumnOrderByPosition(column);
        for (int i = 0; i < remaining.size(); i++) {
            remaining.get(i).setPosition(i);
        }
        noteRepository.saveAll(remaining);

        roomService.broadcastSnapshot(room);
    }
}

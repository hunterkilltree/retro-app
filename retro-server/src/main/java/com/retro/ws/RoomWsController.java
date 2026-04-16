package com.retro.ws;

import com.retro.entity.BoardColumn;
import com.retro.entity.Note;
import com.retro.entity.NoteGroup;
import com.retro.entity.Participant;
import com.retro.entity.Room;
import com.retro.entity.enums.BoardState;
import com.retro.entity.enums.ParticipantRole;
import com.retro.entity.ActionItem;
import com.retro.repository.ActionItemRepository;
import com.retro.repository.NoteGroupRepository;
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
    private final NoteGroupRepository noteGroupRepository;
    private final ActionItemRepository actionItemRepository;
    private final WebSocketSessionRegistry registry;
    private final RoomService roomService;

    public RoomWsController(
            RoomRepository roomRepository,
            ParticipantRepository participantRepository,
            BoardColumnRepository boardColumnRepository,
            NoteRepository noteRepository,
            NoteGroupRepository noteGroupRepository,
            ActionItemRepository actionItemRepository,
            WebSocketSessionRegistry registry,
            RoomService roomService
    ) {
        this.roomRepository = roomRepository;
        this.participantRepository = participantRepository;
        this.boardColumnRepository = boardColumnRepository;
        this.noteRepository = noteRepository;
        this.noteGroupRepository = noteGroupRepository;
        this.actionItemRepository = actionItemRepository;
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

    // ─── Grouping ─────────────────────────────────────────────────────────────

    record GroupNotesPayload(String draggedNoteId, String targetNoteId) {}

    /**
     * Admin drags one note onto another → both land in the same group.
     * If the target note is already in a group, the dragged note joins that group.
     * Otherwise a new group is created in the same column.
     */
    @MessageMapping("/room/{roomCode}/groupNotes")
    @Transactional
    public void groupNotes(
            @DestinationVariable String roomCode,
            @Payload GroupNotesPayload payload,
            SimpMessageHeaderAccessor headerAccessor
    ) {
        Room room = resolveRoom(roomCode);
        Participant p = resolveParticipant(headerAccessor, room);

        if (p.getRole() != ParticipantRole.ADMIN) {
            throw new UnauthorizedException("Only admin can group notes");
        }
        if (room.getState() != BoardState.REVIEW) return;

        Note dragged = noteRepository.findById(UUID.fromString(payload.draggedNoteId()))
                .filter(n -> n.getRoom().getId().equals(room.getId()))
                .orElseThrow(() -> new RoomNotFoundException("Dragged note not found"));

        Note target = noteRepository.findById(UUID.fromString(payload.targetNoteId()))
                .filter(n -> n.getRoom().getId().equals(room.getId()))
                .orElseThrow(() -> new RoomNotFoundException("Target note not found"));

        // Notes must be in the same column
        if (!dragged.getColumn().getId().equals(target.getColumn().getId())) return;

        NoteGroup group;
        if (target.getGroup() != null) {
            // Target is already grouped — join that group
            group = target.getGroup();
        } else {
            // Create a new group in this column
            int position = noteGroupRepository.findByColumnOrderByPosition(target.getColumn()).size();
            group = new NoteGroup();
            group.setRoom(room);
            group.setColumn(target.getColumn());
            group.setName(null);   // unnamed until admin renames (FR-25)
            group.setPosition(position);
            group = noteGroupRepository.save(group);
            // Put the target note into the new group
            target.setGroup(group);
            noteRepository.save(target);
        }

        // Add dragged note to the group
        dragged.setGroup(group);
        noteRepository.save(dragged);

        roomService.broadcastSnapshot(room);
    }

    // ─── Group rename ─────────────────────────────────────────────────────────

    record RenameGroupPayload(String groupId, String name) {}

    /**
     * Admin renames a group (state must be REVIEW).
     * Passing an empty/blank name clears the label (shows default "Group" in UI).
     */
    @MessageMapping("/room/{roomCode}/renameGroup")
    @Transactional
    public void renameGroup(
            @DestinationVariable String roomCode,
            @Payload RenameGroupPayload payload,
            SimpMessageHeaderAccessor headerAccessor
    ) {
        Room room = resolveRoom(roomCode);
        Participant p = resolveParticipant(headerAccessor, room);

        if (p.getRole() != ParticipantRole.ADMIN) {
            throw new UnauthorizedException("Only admin can rename groups");
        }
        if (room.getState() != BoardState.REVIEW) return;

        NoteGroup group = noteGroupRepository.findById(UUID.fromString(payload.groupId()))
                .filter(g -> g.getRoom().getId().equals(room.getId()))
                .orElseThrow(() -> new RoomNotFoundException("Group not found"));

        String trimmed = payload.name() == null ? null : payload.name().strip();
        group.setName(trimmed == null || trimmed.isBlank() ? null : trimmed);
        noteGroupRepository.save(group);

        roomService.broadcastSnapshot(room);
    }

    // ─── Ungroup note ─────────────────────────────────────────────────────────

    record UngroupNotePayload(String noteId) {}

    /**
     * Admin removes a note from its group (state must be REVIEW).
     * If the group has only one note remaining after removal, that note is also
     * ungrouped and the now-empty group is deleted.
     */
    @MessageMapping("/room/{roomCode}/ungroupNote")
    @Transactional
    public void ungroupNote(
            @DestinationVariable String roomCode,
            @Payload UngroupNotePayload payload,
            SimpMessageHeaderAccessor headerAccessor
    ) {
        Room room = resolveRoom(roomCode);
        Participant p = resolveParticipant(headerAccessor, room);

        if (p.getRole() != ParticipantRole.ADMIN) {
            throw new UnauthorizedException("Only admin can ungroup notes");
        }
        if (room.getState() != BoardState.REVIEW) return;

        Note note = noteRepository.findById(UUID.fromString(payload.noteId()))
                .filter(n -> n.getRoom().getId().equals(room.getId()))
                .orElseThrow(() -> new RoomNotFoundException("Note not found"));

        NoteGroup group = note.getGroup();
        if (group == null) return; // already ungrouped

        note.setGroup(null);
        noteRepository.save(note);

        // Find remaining notes in this group
        List<Note> remaining = noteRepository.findByGroupOrderByPosition(group);
        if (remaining.size() <= 1) {
            // Dissolve the group — ungroup the last note if any
            if (!remaining.isEmpty()) {
                Note last = remaining.get(0);
                last.setGroup(null);
                noteRepository.save(last);
            }
            noteGroupRepository.delete(group);
        }

        roomService.broadcastSnapshot(room);
    }

    // ─── Action items (DONE state) ────────────────────────────────────────────

    record AddActionItemPayload(String content) {}

    /** Admin adds an action item (state must be DONE). */
    @MessageMapping("/room/{roomCode}/addActionItem")
    @Transactional
    public void addActionItem(
            @DestinationVariable String roomCode,
            @Payload AddActionItemPayload payload,
            SimpMessageHeaderAccessor headerAccessor
    ) {
        Room room = resolveRoom(roomCode);
        Participant p = resolveParticipant(headerAccessor, room);

        if (p.getRole() != ParticipantRole.ADMIN) {
            throw new UnauthorizedException("Only admin can add action items");
        }
        if (room.getState() != BoardState.DONE) return;

        String content = payload.content() == null ? "" : payload.content().strip();
        if (content.isBlank()) return;

        int position = actionItemRepository.findByRoomOrderByPosition(room).size();
        ActionItem item = new ActionItem();
        item.setRoom(room);
        item.setContent(content);
        item.setPosition(position);
        actionItemRepository.save(item);

        roomService.broadcastSnapshot(room);
    }

    record DeleteActionItemPayload(String actionItemId) {}

    /** Admin deletes an action item (state must be DONE). */
    @MessageMapping("/room/{roomCode}/deleteActionItem")
    @Transactional
    public void deleteActionItem(
            @DestinationVariable String roomCode,
            @Payload DeleteActionItemPayload payload,
            SimpMessageHeaderAccessor headerAccessor
    ) {
        Room room = resolveRoom(roomCode);
        Participant p = resolveParticipant(headerAccessor, room);

        if (p.getRole() != ParticipantRole.ADMIN) {
            throw new UnauthorizedException("Only admin can delete action items");
        }
        if (room.getState() != BoardState.DONE) return;

        ActionItem item = actionItemRepository.findById(UUID.fromString(payload.actionItemId()))
                .filter(a -> a.getRoom().getId().equals(room.getId()))
                .orElseThrow(() -> new RoomNotFoundException("Action item not found"));

        actionItemRepository.delete(item);

        // Re-index remaining
        List<ActionItem> remaining = actionItemRepository.findByRoomOrderByPosition(room);
        for (int i = 0; i < remaining.size(); i++) remaining.get(i).setPosition(i);
        actionItemRepository.saveAll(remaining);

        roomService.broadcastSnapshot(room);
    }
}

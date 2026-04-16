package com.retro.repository;

import com.retro.entity.BoardColumn;
import com.retro.entity.Note;
import com.retro.entity.NoteGroup;
import com.retro.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface NoteRepository extends JpaRepository<Note, UUID> {
    List<Note> findByRoomOrderByPosition(Room room);

    List<Note> findByColumnOrderByPosition(BoardColumn column);

    List<Note> findByGroupOrderByPosition(NoteGroup group);

    @Query("""
            select n from Note n
              join fetch n.participant p
              join fetch n.column c
              left join fetch n.group g
            where n.room = :room
            order by n.position
            """)
    List<Note> findSnapshotNotesByRoom(@Param("room") Room room);
}


package com.retro.repository;

import com.retro.entity.BoardColumn;
import com.retro.entity.NoteGroup;
import com.retro.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface NoteGroupRepository extends JpaRepository<NoteGroup, UUID> {
    List<NoteGroup> findByColumnOrderByPosition(BoardColumn column);

    @Query("""
            select g from NoteGroup g
              join fetch g.column c
            where g.room = :room
            order by g.position
            """)
    List<NoteGroup> findSnapshotGroupsByRoom(@Param("room") Room room);
}


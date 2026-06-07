package com.retro.repository;

import com.retro.entity.Note;
import com.retro.entity.Participant;
import com.retro.entity.Room;
import com.retro.entity.Vote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VoteRepository extends JpaRepository<Vote, UUID> {

    /** All votes in a room with note + participant eagerly fetched (for snapshots). */
    @Query("""
            select v from Vote v
              join fetch v.note n
              join fetch v.participant p
            where v.room = :room
            """)
    List<Vote> findSnapshotVotesByRoom(@Param("room") Room room);

    Optional<Vote> findByNoteAndParticipant(Note note, Participant participant);

    long countByRoomAndParticipant(Room room, Participant participant);
}

package com.retro.repository;

import com.retro.entity.Participant;
import com.retro.entity.Room;
import com.retro.entity.enums.ParticipantRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ParticipantRepository extends JpaRepository<Participant, UUID> {
    Optional<Participant> findBySessionToken(String token);

    @Query("select p from Participant p join fetch p.room where p.sessionToken = :token")
    Optional<Participant> findWithRoomBySessionToken(@Param("token") String token);

    List<Participant> findByRoom(Room room);

    Optional<Participant> findByRoomAndRole(Room room, ParticipantRole role);

    long countByRoom(Room room);
}


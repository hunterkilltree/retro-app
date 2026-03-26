package com.retro.repository;

import com.retro.entity.BoardColumn;
import com.retro.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BoardColumnRepository extends JpaRepository<BoardColumn, UUID> {
    List<BoardColumn> findByRoomOrderByPosition(Room room);
}


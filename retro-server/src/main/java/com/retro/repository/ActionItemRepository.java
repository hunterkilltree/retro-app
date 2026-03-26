package com.retro.repository;

import com.retro.entity.ActionItem;
import com.retro.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ActionItemRepository extends JpaRepository<ActionItem, UUID> {
    List<ActionItem> findByRoomOrderByPosition(Room room);
}


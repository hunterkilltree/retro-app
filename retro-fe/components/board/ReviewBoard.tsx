"use client";

import { useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { useState } from "react";
import styles from "./ReviewBoard.module.css";
import type { BoardColumn, Participant, SnapshotGroup, SnapshotNote } from "@/lib/types";

// ── Draggable ungrouped note ─────────────────────────────────────────────────
function DraggableNote({
  note,
  isOver,
}: {
  note: SnapshotNote;
  isOver: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `note-${note.id}`,
    data: { noteId: note.id },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`${styles.noteCard}
        ${isDragging ? styles.noteCardDragging : ""}
        ${isOver ? styles.noteCardOver : ""}`}
      style={{ borderLeftColor: note.authorColor }}
    >
      <div className={styles.noteContent}>{note.content}</div>
      <div className={styles.noteFooter}>
        <span className={styles.authorDot} style={{ backgroundColor: note.authorColor }} />
        <span className={styles.authorName}>{note.authorName}</span>
      </div>
    </div>
  );
}

// ── Drop target wrapper for a note ───────────────────────────────────────────
function DroppableNote({
  note,
  children,
}: {
  note: SnapshotNote;
  children: (isOver: boolean) => React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `drop-${note.id}`,
    data: { targetNoteId: note.id },
  });
  return <div ref={setNodeRef}>{children(isOver)}</div>;
}

// ── Note inside a group (drop target, not draggable yet) ─────────────────────
function GroupedNote({
  note,
  onDrop,
}: {
  note: SnapshotNote;
  onDrop: (targetNoteId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `drop-${note.id}`,
    data: { targetNoteId: note.id },
  });

  return (
    <div
      ref={setNodeRef}
      className={`${styles.groupedNote} ${isOver ? styles.groupedNoteOver : ""}`}
      style={{ borderLeftColor: note.authorColor }}
    >
      <div className={styles.noteContent}>{note.content}</div>
      <div className={styles.noteFooter}>
        <span className={styles.authorDot} style={{ backgroundColor: note.authorColor }} />
        <span className={styles.authorName}>{note.authorName}</span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface ReviewBoardProps {
  columns: BoardColumn[];
  notes: SnapshotNote[];
  groups: SnapshotGroup[];
  me: Participant;
  onGroupNotes: (draggedNoteId: string, targetNoteId: string) => void;
  onMoveToDone: () => void;
}

export function ReviewBoard({
  columns,
  notes,
  groups,
  me,
  onGroupNotes,
  onMoveToDone,
}: ReviewBoardProps) {
  const isAdmin = me.role === "ADMIN";
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Group notes by columnId and groupId
  const notesByColumn = useMemo(() => {
    const map = new Map<string, { ungrouped: SnapshotNote[]; groups: Map<string, SnapshotNote[]> }>();
    for (const col of columns) {
      map.set(col.id, { ungrouped: [], groups: new Map() });
    }
    for (const note of notes) {
      const col = map.get(note.columnId);
      if (!col) continue;
      if (note.groupId) {
        const existing = col.groups.get(note.groupId) ?? [];
        existing.push(note);
        col.groups.set(note.groupId, existing);
      } else {
        col.ungrouped.push(note);
      }
    }
    return map;
  }, [columns, notes]);

  function handleDragStart(event: DragStartEvent) {
    setActiveNoteId(event.active.data.current?.noteId ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveNoteId(null);
    const draggedNoteId = event.active.data.current?.noteId as string | undefined;
    const targetNoteId = event.over?.data.current?.targetNoteId as string | undefined;

    if (!draggedNoteId || !targetNoteId || draggedNoteId === targetNoteId) return;
    onGroupNotes(draggedNoteId, targetNoteId);
  }

  const activeNote = activeNoteId ? notes.find((n) => n.id === activeNoteId) : null;

  return (
    <DndContext
      sensors={isAdmin ? sensors : undefined}
      onDragStart={isAdmin ? handleDragStart : undefined}
      onDragEnd={isAdmin ? handleDragEnd : undefined}
    >
      <div className={styles.layout}>
        <div className={styles.columns}>
          {columns.map((col) => {
            const colData = notesByColumn.get(col.id);
            const colGroups = groups.filter((g) => g.columnId === col.id);
            const totalNotes = notes.filter((n) => n.columnId === col.id).length;

            return (
              <div key={col.id} className={styles.column}>
                <div className={styles.header}>
                  <div className={styles.colorStrip} style={{ backgroundColor: col.color }} />
                  <span className={styles.title}>{col.title}</span>
                  <span className={styles.count}>{totalNotes}</span>
                </div>

                <div className={styles.notes}>
                  {/* Groups */}
                  {colGroups.map((group) => {
                    const groupNotes = colData?.groups.get(group.id) ?? [];
                    return (
                      <div key={group.id} className={styles.group}>
                        <div className={styles.groupLabel}>
                          {group.name ?? "Group"}
                        </div>
                        <div className={styles.groupNotes}>
                          {groupNotes.map((note) => (
                            <GroupedNote
                              key={note.id}
                              note={note}
                              onDrop={onGroupNotes.bind(null, "")}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Ungrouped notes */}
                  {colData?.ungrouped.map((note) => (
                    <DroppableNote key={note.id} note={note}>
                      {(isOver) =>
                        isAdmin ? (
                          <DraggableNote note={note} isOver={isOver} />
                        ) : (
                          <div
                            className={styles.noteCard}
                            style={{ borderLeftColor: note.authorColor, cursor: "default" }}
                          >
                            <div className={styles.noteContent}>{note.content}</div>
                            <div className={styles.noteFooter}>
                              <span className={styles.authorDot} style={{ backgroundColor: note.authorColor }} />
                              <span className={styles.authorName}>{note.authorName}</span>
                            </div>
                          </div>
                        )
                      }
                    </DroppableNote>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {isAdmin && (
          <div className={styles.adminBar}>
            <span className={styles.hint}>Drag notes onto each other to group them</span>
            <button className={styles.doneBtn} onClick={onMoveToDone}>
              Move to Done →
            </button>
          </div>
        )}
      </div>

      {/* Drag overlay — ghost card that follows cursor */}
      <DragOverlay>
        {activeNote && (
          <div
            className={styles.noteCard}
            style={{
              borderLeftColor: activeNote.authorColor,
              opacity: 0.9,
              boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
              cursor: "grabbing",
            }}
          >
            <div className={styles.noteContent}>{activeNote.content}</div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

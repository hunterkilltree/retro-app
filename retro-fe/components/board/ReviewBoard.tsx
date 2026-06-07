"use client";

import { useMemo, useRef, useState } from "react";
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
import styles from "./ReviewBoard.module.css";
import type { BoardColumn, Participant, SnapshotGroup, SnapshotNote, Vote } from "@/lib/types";

// Per-note voting state, computed once in the parent and threaded down.
type VoteInfo = {
  count: number;
  mine: boolean;
  canVote: boolean;
  onToggle: () => void;
};

// ── Vote button (used on every note card) ────────────────────────────────────
function VoteButton({ vote }: { vote: VoteInfo }) {
  return (
    <button
      type="button"
      className={`${styles.voteBtn} ${vote.mine ? styles.voteBtnMine : ""}`}
      disabled={!vote.mine && !vote.canVote}
      title={
        vote.mine
          ? "Remove your vote"
          : vote.canVote
            ? "Vote for this note"
            : "No votes left"
      }
      // Stop the pointer/click from starting a drag on draggable notes.
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        vote.onToggle();
      }}
    >
      <span className={styles.voteIcon}>▲</span>
      <span className={styles.voteCount}>{vote.count}</span>
    </button>
  );
}

// ── Draggable ungrouped note ─────────────────────────────────────────────────
function DraggableNote({
  note,
  isOver,
  vote,
}: {
  note: SnapshotNote;
  isOver: boolean;
  vote: VoteInfo;
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
      <VoteButton vote={vote} />
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

// ── Note inside a group (drop target; admin gets ✕ ungroup button) ───────────
function GroupedNote({
  note,
  isAdmin,
  onUngroup,
  vote,
}: {
  note: SnapshotNote;
  isAdmin: boolean;
  onUngroup: (noteId: string) => void;
  vote: VoteInfo;
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
      {isAdmin && (
        <button
          className={styles.ungroupBtn}
          onClick={() => onUngroup(note.id)}
          title="Remove from group"
          aria-label="Remove from group"
        >
          ✕
        </button>
      )}
      <div className={styles.noteContent}>{note.content}</div>
      <div className={styles.noteFooter}>
        <span className={styles.authorDot} style={{ backgroundColor: note.authorColor }} />
        <span className={styles.authorName}>{note.authorName}</span>
      </div>
      <VoteButton vote={vote} />
    </div>
  );
}

// ── Inline-editable group label (admin only) ─────────────────────────────────
function GroupLabel({
  group,
  isAdmin,
  totalVotes,
  onRename,
}: {
  group: SnapshotGroup;
  isAdmin: boolean;
  totalVotes: number;
  onRename: (groupId: string, name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(group.name ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    if (!isAdmin) return;
    setDraft(group.name ?? "");
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commit() {
    setEditing(false);
    onRename(group.id, draft);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className={styles.groupLabelInput}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        maxLength={60}
        placeholder="Group name…"
        autoFocus
      />
    );
  }

  return (
    <div
      className={styles.groupLabel}
      onClick={startEdit}
      title={isAdmin ? "Click to rename" : undefined}
      style={{ cursor: isAdmin ? "text" : "default" }}
    >
      <span className={styles.groupLabelText}>{group.name || "Group"}</span>
      {isAdmin && <span className={styles.groupLabelEdit}>✏</span>}
      <span className={styles.groupVotes} title="Total votes in this group">
        ▲ {totalVotes}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface ReviewBoardProps {
  columns: BoardColumn[];
  notes: SnapshotNote[];
  groups: SnapshotGroup[];
  votes: Vote[];
  votesPerUser: number;
  me: Participant;
  onGroupNotes: (draggedNoteId: string, targetNoteId: string) => void;
  onRenameGroup: (groupId: string, name: string) => void;
  onUngroupNote: (noteId: string) => void;
  onToggleVote: (noteId: string) => void;
  onMoveToDone: () => void;
}

export function ReviewBoard({
  columns,
  notes,
  groups,
  votes,
  votesPerUser,
  me,
  onGroupNotes,
  onRenameGroup,
  onUngroupNote,
  onToggleVote,
  onMoveToDone,
}: ReviewBoardProps) {
  const isAdmin = me.role === "ADMIN";
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // ── Vote tallies ──
  const voteCountByNote = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of votes) m.set(v.noteId, (m.get(v.noteId) ?? 0) + 1);
    return m;
  }, [votes]);

  const myVotedNoteIds = useMemo(() => {
    const s = new Set<string>();
    for (const v of votes) if (v.participantId === me.id) s.add(v.noteId);
    return s;
  }, [votes, me.id]);

  const myVoteCount = myVotedNoteIds.size;
  const remaining = Math.max(0, votesPerUser - myVoteCount);

  function voteInfo(noteId: string): VoteInfo {
    return {
      count: voteCountByNote.get(noteId) ?? 0,
      mine: myVotedNoteIds.has(noteId),
      canVote: remaining > 0,
      onToggle: () => onToggleVote(noteId),
    };
  }

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
        {/* Votes remaining indicator (everyone) */}
        <div className={styles.voteBar}>
          <span className={styles.voteBarLabel}>Your votes</span>
          <span className={styles.voteBarPills}>
            {Array.from({ length: votesPerUser }).map((_, i) => (
              <span
                key={i}
                className={`${styles.voteDot} ${i < myVoteCount ? styles.voteDotUsed : ""}`}
              />
            ))}
          </span>
          <span className={styles.voteBarText}>
            {remaining} of {votesPerUser} left
          </span>
        </div>

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
                    const groupVotes = groupNotes.reduce(
                      (sum, n) => sum + (voteCountByNote.get(n.id) ?? 0),
                      0
                    );
                    return (
                      <div key={group.id} className={styles.group}>
                        <GroupLabel
                          group={group}
                          isAdmin={isAdmin}
                          totalVotes={groupVotes}
                          onRename={onRenameGroup}
                        />
                        <div className={styles.groupNotes}>
                          {groupNotes.map((note) => (
                            <GroupedNote
                              key={note.id}
                              note={note}
                              isAdmin={isAdmin}
                              onUngroup={onUngroupNote}
                              vote={voteInfo(note.id)}
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
                          <DraggableNote note={note} isOver={isOver} vote={voteInfo(note.id)} />
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
                            <VoteButton vote={voteInfo(note.id)} />
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

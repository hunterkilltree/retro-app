"use client";

import { useCallback } from "react";
import styles from "./StartBoard.module.css";
import { TimerBar } from "./TimerBar";
import { ColumnPanel } from "./ColumnPanel";
import type { BoardColumn, Participant, SnapshotNote } from "@/lib/types";

interface StartBoardProps {
  columns: BoardColumn[];
  notes: SnapshotNote[];
  me: Participant;
  timerEndsAtMs: number | null;
  totalSeconds: number;
  onAddNote: (columnId: string, content: string) => void;
  onEditNote: (noteId: string, content: string) => void;
  onDeleteNote: (noteId: string) => void;
  onMoveToReview: () => void;
}

export function StartBoard({
  columns,
  notes,
  me,
  timerEndsAtMs,
  totalSeconds,
  onAddNote,
  onEditNote,
  onDeleteNote,
  onMoveToReview,
}: StartBoardProps) {
  const isAdmin = me.role === "ADMIN";

  const notesForColumn = useCallback(
    (columnId: string) => notes.filter((n) => n.columnId === columnId),
    [notes]
  );

  return (
    <div className={styles.layout}>
      {/* Live countdown */}
      <TimerBar timerEndsAtMs={timerEndsAtMs} totalSeconds={totalSeconds} />

      {/* Columns */}
      <div className={styles.columns}>
        {columns.map((col) => (
          <ColumnPanel
            key={col.id}
            column={col}
            notes={notesForColumn(col.id)}
            myParticipantId={me.id}
            isAdmin={isAdmin}
            onAddNote={onAddNote}
            onEditNote={onEditNote}
            onDeleteNote={onDeleteNote}
          />
        ))}
      </div>

      {/* Admin: Move to Review */}
      {isAdmin && (
        <div className={styles.adminBar}>
          <span className={styles.reviewHint}>
            {notes.length} note{notes.length !== 1 ? "s" : ""} written
          </span>
          <button
            type="button"
            className={styles.reviewBtn}
            onClick={onMoveToReview}
          >
            Move to Review →
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import styles from "./ReviewBoard.module.css";
import type { BoardColumn, Participant, SnapshotNote } from "@/lib/types";

interface ReviewBoardProps {
  columns: BoardColumn[];
  notes: SnapshotNote[];
  me: Participant;
  onMoveToDone: () => void;
}

export function ReviewBoard({ columns, notes, me, onMoveToDone }: ReviewBoardProps) {
  const isAdmin = me.role === "ADMIN";

  return (
    <div className={styles.layout}>
      <div className={styles.columns}>
        {columns.map((col) => {
          const colNotes = notes.filter((n) => n.columnId === col.id);
          return (
            <div key={col.id} className={styles.column}>
              <div className={styles.header}>
                <div className={styles.colorStrip} style={{ backgroundColor: col.color }} />
                <span className={styles.title}>{col.title}</span>
                <span className={styles.count}>{colNotes.length}</span>
              </div>
              <div className={styles.notes}>
                {colNotes.map((note) => (
                  <div
                    key={note.id}
                    className={styles.noteCard}
                    style={{ borderLeftColor: note.authorColor }}
                  >
                    <div className={styles.noteContent}>{note.content}</div>
                    <div className={styles.noteFooter}>
                      <span
                        className={styles.authorDot}
                        style={{ backgroundColor: note.authorColor }}
                      />
                      <span className={styles.authorName}>{note.authorName}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {isAdmin && (
        <div className={styles.adminBar}>
          <span className={styles.hint}>Group notes, then move to Done</span>
          <button className={styles.doneBtn} onClick={onMoveToDone}>
            Move to Done →
          </button>
        </div>
      )}
    </div>
  );
}

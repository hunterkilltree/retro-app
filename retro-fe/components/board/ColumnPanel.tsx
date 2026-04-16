"use client";

import { useState } from "react";
import styles from "./ColumnPanel.module.css";
import { NoteCard } from "./NoteCard";
import { SkeletonNote } from "./SkeletonNote";
import type { BoardColumn, SnapshotNote } from "@/lib/types";

interface ColumnPanelProps {
  column: BoardColumn;
  notes: SnapshotNote[];
  myParticipantId: string;
  isAdmin: boolean;
  onAddNote: (columnId: string, content: string) => void;
  onEditNote: (noteId: string, content: string) => void;
  onDeleteNote: (noteId: string) => void;
}

export function ColumnPanel({
  column,
  notes,
  myParticipantId,
  isAdmin,
  onAddNote,
  onEditNote,
  onDeleteNote,
}: ColumnPanelProps) {
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");

  function handleAdd() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAddNote(column.id, trimmed);
    setDraft("");
    setComposing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
    if (e.key === "Escape") {
      setDraft("");
      setComposing(false);
    }
  }

  return (
    <div className={styles.column}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.colorStrip} style={{ backgroundColor: column.color }} />
        <span className={styles.title}>{column.title}</span>
        <span className={styles.count}>{notes.length}</span>
      </div>

      {/* Notes */}
      <div className={styles.notes}>
        {notes.map((note) => {
          const isOwn = note.participantId === myParticipantId;

          // Guests see other people's notes as skeletons in START state
          if (!isOwn && !isAdmin) {
            return <SkeletonNote key={note.id} authorColor={note.authorColor} />;
          }

          return (
            <NoteCard
              key={note.id}
              note={note}
              isOwn={isOwn}
              onEdit={onEditNote}
              onDelete={onDeleteNote}
            />
          );
        })}
      </div>

      {/* Add note area */}
      {composing ? (
        <div className={styles.addForm}>
          <textarea
            autoFocus
            className={styles.addTextarea}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write your note… (Enter to save)"
            maxLength={500}
          />
          <div className={styles.addActions}>
            <button
              className={styles.addBtn}
              disabled={!draft.trim()}
              onClick={handleAdd}
            >
              Add note
            </button>
            <button
              className={styles.cancelBtn}
              onClick={() => { setDraft(""); setComposing(false); }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={styles.addTrigger}
          onClick={() => setComposing(true)}
        >
          + Add note
        </button>
      )}
    </div>
  );
}

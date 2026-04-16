"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./NoteCard.module.css";
import type { SnapshotNote } from "@/lib/types";

interface NoteCardProps {
  note: SnapshotNote;
  isOwn: boolean;
  onEdit: (noteId: string, content: string) => void;
  onDelete: (noteId: string) => void;
}

export function NoteCard({ note, isOwn, onEdit, onDelete }: NoteCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  // Keep draft in sync if note updates from WS
  useEffect(() => {
    if (!editing) setDraft(note.content);
  }, [note.content, editing]);

  function handleSave() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onEdit(note.id, trimmed);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      setDraft(note.content);
      setEditing(false);
    }
  }

  return (
    <div
      className={styles.card}
      style={{ borderLeftColor: note.authorColor }}
    >
      {editing ? (
        <>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={500}
          />
          <div className={styles.editActions}>
            <button className={styles.saveBtn} onClick={handleSave}>
              Save
            </button>
            <button
              className={styles.cancelBtn}
              onClick={() => { setDraft(note.content); setEditing(false); }}
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <div className={styles.content}>{note.content}</div>
      )}

      <div className={styles.footer}>
        <span className={styles.authorDot} style={{ backgroundColor: note.authorColor }} />
        <span className={styles.authorName}>{note.authorName}</span>
        {isOwn && !editing && (
          <div className={styles.actions}>
            <button
              className={styles.actionBtn}
              onClick={() => setEditing(true)}
              title="Edit note"
            >
              ✏️
            </button>
            <button
              className={`${styles.actionBtn} ${styles.deleteBtn}`}
              onClick={() => onDelete(note.id)}
              title="Delete note"
            >
              🗑
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

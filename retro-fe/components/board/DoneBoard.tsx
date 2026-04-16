"use client";

import { useState } from "react";
import styles from "./DoneBoard.module.css";
import type { BoardColumn, Participant, SnapshotActionItem, SnapshotGroup, SnapshotNote } from "@/lib/types";

interface DoneBoardProps {
  columns: BoardColumn[];
  notes: SnapshotNote[];
  groups: SnapshotGroup[];
  actionItems: SnapshotActionItem[];
  me: Participant;
  roomCode: string;
  sessionToken: string;
  onAddActionItem: (content: string) => void;
  onDeleteActionItem: (id: string) => void;
}

export function DoneBoard({
  columns,
  notes,
  groups,
  actionItems,
  me,
  roomCode,
  sessionToken,
  onAddActionItem,
  onDeleteActionItem,
}: DoneBoardProps) {
  const isAdmin = me.role === "ADMIN";
  const [draft, setDraft] = useState("");
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/export/pdf`, {
        headers: { "X-Session-Token": sessionToken },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `retro-${roomCode}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  function submitActionItem() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAddActionItem(trimmed);
    setDraft("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitActionItem();
    }
  }

  // Build column → groups/notes structure
  const colData = (colId: string) => {
    const colGroups = groups.filter((g) => g.columnId === colId);
    const ungrouped = notes.filter((n) => n.columnId === colId && !n.groupId);
    return { colGroups, ungrouped };
  };

  return (
    <div className={styles.layout}>
      {/* ── Summary section ── */}
      <div className={styles.summarySection}>
        <div className={styles.sectionTitle}>Session Summary</div>
        <div className={styles.columns}>
          {columns.map((col) => {
            const { colGroups, ungrouped } = colData(col.id);
            const totalNotes = notes.filter((n) => n.columnId === col.id).length;
            return (
              <div key={col.id} className={styles.column}>
                <div className={styles.colHeader}>
                  <div className={styles.colorStrip} style={{ backgroundColor: col.color }} />
                  <span className={styles.colTitle}>{col.title}</span>
                  <span className={styles.colCount}>{totalNotes}</span>
                </div>
                <div className={styles.colNotes}>
                  {/* Groups */}
                  {colGroups.map((group) => {
                    const groupNotes = notes.filter((n) => n.groupId === group.id);
                    return (
                      <div key={group.id} className={styles.group}>
                        <div className={styles.groupLabel}>{group.name || "Group"}</div>
                        <div className={styles.groupNotes}>
                          {groupNotes.map((note) => (
                            <NoteCard key={note.id} note={note} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {/* Ungrouped */}
                  {ungrouped.map((note) => (
                    <NoteCard key={note.id} note={note} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Action items section ── */}
      <div className={styles.actionSection}>
        <div className={styles.actionHeader}>
          <div className={styles.sectionTitle} style={{ borderBottom: "none", padding: "18px 24px 10px" }}>
            Action Items
          </div>
          <button
            className={styles.exportBtn}
            onClick={handleExport}
            disabled={exporting}
            title="Download PDF summary"
          >
            {exporting ? "Exporting…" : "⬇ Export PDF"}
          </button>
        </div>

        <div className={styles.actionList}>
          {actionItems.length === 0 && (
            <div className={styles.emptyHint}>
              {isAdmin ? "Add your first action item below." : "No action items yet."}
            </div>
          )}
          {actionItems.map((item, i) => (
            <div key={item.id} className={styles.actionItem}>
              <span className={styles.actionIndex}>{i + 1}</span>
              <span className={styles.actionContent}>{item.content}</span>
              {isAdmin && (
                <button
                  className={styles.deleteBtn}
                  onClick={() => onDeleteActionItem(item.id)}
                  title="Delete"
                  aria-label="Delete action item"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {isAdmin && (
          <div className={styles.addRow}>
            <textarea
              className={styles.addInput}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add an action item… (Enter to save)"
              rows={2}
              maxLength={500}
            />
            <button
              className={styles.addBtn}
              onClick={submitActionItem}
              disabled={!draft.trim()}
            >
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function NoteCard({ note }: { note: SnapshotNote }) {
  return (
    <div className={styles.noteCard} style={{ borderLeftColor: note.authorColor }}>
      <div className={styles.noteContent}>{note.content}</div>
      <div className={styles.noteFooter}>
        <span className={styles.authorDot} style={{ backgroundColor: note.authorColor }} />
        <span className={styles.authorName}>{note.authorName}</span>
      </div>
    </div>
  );
}

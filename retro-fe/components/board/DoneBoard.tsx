"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./DoneBoard.module.css";
import type { BoardColumn, Participant, SnapshotActionItem, SnapshotGroup, SnapshotNote } from "@/lib/types";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface DoneBoardProps {
  participants: Participant[];
  columns: BoardColumn[];
  notes: SnapshotNote[];
  groups: SnapshotGroup[];
  actionItems: SnapshotActionItem[];
  me: Participant;
  roomCode: string;
  sessionToken: string;
  onAddActionItem: (content: string) => void;
  onDeleteActionItem: (id: string) => void;
  onUpdateActionItem: (id: string, content: string) => void;
  onEditNote: (noteId: string, content: string) => void;
  onDeleteNote: (noteId: string) => void;
  onRenameGroup: (groupId: string, name: string) => void;
  onUpdateParticipant: (participantId: string, username: string) => void;
  onRemoveParticipant: (participantId: string, deleteNotes: boolean) => void;
  onRoomDeleted?: () => void;
}

export function DoneBoard({
  participants,
  columns,
  notes,
  groups,
  actionItems,
  me,
  roomCode,
  sessionToken,
  onAddActionItem,
  onDeleteActionItem,
  onUpdateActionItem,
  onEditNote,
  onDeleteNote,
  onRenameGroup,
  onUpdateParticipant,
  onRemoveParticipant,
  onRoomDeleted,
}: DoneBoardProps) {
  const isAdmin = me.role === "ADMIN";
  const [draft, setDraft] = useState("");
  const [exporting, setExporting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<SnapshotNote | null>(null);
  const [participantToRemove, setParticipantToRemove] = useState<Participant | null>(null);
  const [alsoDeleteNotes, setAlsoDeleteNotes] = useState(false);

  async function handleDeleteRoom() {
    setDeleting(true);
    try {
      await fetch(`/api/rooms/${encodeURIComponent(roomCode)}`, {
        method: "DELETE",
        headers: { "X-Session-Token": sessionToken },
      });
      // WS broadcasts ROOM_CLOSED to redirect everyone; this is a local fallback.
      onRoomDeleted?.();
    } catch {
      // best-effort — the WS broadcast handles redirect for all clients
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  }

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
        {isAdmin && (
          <div className={styles.editHint}>
            Review everything before exporting — you can rename or remove participants and edit or
            delete notes, group names and action items. The PDF reflects exactly what you see here.
          </div>
        )}

        {/* Participants (host + joined) — mirrors the PDF header */}
        <div className={styles.participantsRow}>
          <span className={styles.participantsLabel}>Participants</span>
          {participants.map((p) => (
            <ParticipantChip
              key={p.id}
              participant={p}
              isAdmin={isAdmin}
              onRename={(name) => onUpdateParticipant(p.id, name)}
              onRemove={() => {
                setAlsoDeleteNotes(false);
                setParticipantToRemove(p);
              }}
            />
          ))}
        </div>
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
                        <GroupLabel
                          name={group.name}
                          isAdmin={isAdmin}
                          onRename={(name) => onRenameGroup(group.id, name)}
                        />
                        <div className={styles.groupNotes}>
                          {groupNotes.map((note) => (
                            <NoteCard
                              key={note.id}
                              note={note}
                              isAdmin={isAdmin}
                              onSave={(content) => onEditNote(note.id, content)}
                              onDelete={() => setNoteToDelete(note)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {/* Ungrouped */}
                  {ungrouped.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      isAdmin={isAdmin}
                      onSave={(content) => onEditNote(note.id, content)}
                      onDelete={() => setNoteToDelete(note)}
                    />
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
          <div className={styles.headerActions}>
            <button
              className={styles.exportBtn}
              onClick={handleExport}
              disabled={exporting}
              title="Download PDF summary"
            >
              {exporting ? "Exporting…" : "⬇ Export PDF"}
            </button>
            {isAdmin && (
              <button
                className={styles.deleteRoomBtn}
                onClick={() => setShowDeleteDialog(true)}
                title="Delete room and all data"
              >
                🗑 Delete Room
              </button>
            )}
          </div>
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
              {editingActionId === item.id ? (
                <InlineEditor
                  initialValue={item.content}
                  multiline
                  maxLength={500}
                  ariaLabel="Edit action item"
                  onSave={(content) => {
                    if (content !== item.content) onUpdateActionItem(item.id, content);
                    setEditingActionId(null);
                  }}
                  onCancel={() => setEditingActionId(null)}
                />
              ) : (
                <span className={styles.actionContent}>{item.content}</span>
              )}
              {isAdmin && editingActionId !== item.id && (
                <span className={styles.itemControls}>
                  <button
                    className={styles.iconBtn}
                    onClick={() => setEditingActionId(item.id)}
                    title="Edit"
                    aria-label="Edit action item"
                  >
                    ✎
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => onDeleteActionItem(item.id)}
                    title="Delete"
                    aria-label="Delete action item"
                  >
                    ✕
                  </button>
                </span>
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

      {/* Delete-note confirmation */}
      {noteToDelete && (
        <ConfirmDialog
          title="Delete Note"
          message={`Delete this note by ${noteToDelete.authorName}? It will be removed from the summary and the PDF export, along with its votes.`}
          confirmLabel="Delete note"
          dangerous
          onConfirm={() => {
            onDeleteNote(noteToDelete.id);
            setNoteToDelete(null);
          }}
          onCancel={() => setNoteToDelete(null)}
        />
      )}

      {/* Remove-participant confirmation */}
      {participantToRemove && (
        <ConfirmDialog
          title="Remove Participant"
          message={`Remove ${participantToRemove.username} from the participant list? They will no longer appear in the PDF export.`}
          confirmLabel="Remove"
          dangerous
          onConfirm={() => {
            onRemoveParticipant(participantToRemove.id, alsoDeleteNotes);
            setParticipantToRemove(null);
          }}
          onCancel={() => setParticipantToRemove(null)}
        >
          {(() => {
            const count = notes.filter((n) => n.participantId === participantToRemove.id).length;
            return (
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={alsoDeleteNotes}
                  onChange={(e) => setAlsoDeleteNotes(e.target.checked)}
                  disabled={count === 0}
                />
                Also delete their {count} note{count === 1 ? "" : "s"}
              </label>
            );
          })()}
        </ConfirmDialog>
      )}

      {/* Delete-room confirmation */}
      {showDeleteDialog && (
        <ConfirmDialog
          title="Delete Room"
          message="Are you sure you want to delete this retrospective? This will permanently remove all notes, groups, votes, and action items and disconnect all participants."
          confirmLabel={deleting ? "Deleting…" : "Yes, delete"}
          cancelLabel="Cancel"
          dangerous
          onConfirm={handleDeleteRoom}
          onCancel={() => setShowDeleteDialog(false)}
        />
      )}
    </div>
  );
}

interface InlineEditorProps {
  initialValue: string;
  multiline?: boolean;
  maxLength: number;
  ariaLabel: string;
  /** Allow saving an empty value (e.g. clearing a group name). */
  allowEmpty?: boolean;
  onSave: (value: string) => void;
  onCancel: () => void;
}

/** Inline text editor: Enter saves (Shift+Enter for newline when multiline), Esc cancels. */
function InlineEditor({
  initialValue,
  multiline = false,
  maxLength,
  ariaLabel,
  allowEmpty = false,
  onSave,
  onCancel,
}: InlineEditorProps) {
  const [value, setValue] = useState(initialValue);
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const trimmed = value.trim();
  const canSave = allowEmpty || trimmed.length > 0;

  function save() {
    if (!canSave) return;
    onSave(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    } else if (e.key === "Enter" && !(multiline && e.shiftKey)) {
      e.preventDefault();
      save();
    }
  }

  return (
    <div className={styles.inlineEditor}>
      {multiline ? (
        <textarea
          ref={ref}
          className={styles.editInput}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={maxLength}
          rows={3}
          aria-label={ariaLabel}
        />
      ) : (
        <input
          ref={ref}
          className={styles.editInput}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={maxLength}
          aria-label={ariaLabel}
        />
      )}
      <div className={styles.editActions}>
        <button className={styles.editCancelBtn} onClick={onCancel}>
          Cancel
        </button>
        <button className={styles.editSaveBtn} onClick={save} disabled={!canSave}>
          Save
        </button>
      </div>
    </div>
  );
}

interface ParticipantChipProps {
  participant: Participant;
  isAdmin: boolean;
  onRename: (username: string) => void;
  onRemove: () => void;
}

function ParticipantChip({ participant, isAdmin, onRename, onRemove }: ParticipantChipProps) {
  const [editing, setEditing] = useState(false);
  const isHost = participant.role === "ADMIN";

  if (editing) {
    return (
      <div className={styles.participantEditing}>
        <InlineEditor
          initialValue={participant.username}
          maxLength={30}
          ariaLabel={`Rename ${participant.username}`}
          onSave={(name) => {
            if (name !== participant.username) onRename(name);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <span className={`${styles.participantChip} ${isHost ? styles.hostChip : ""}`}>
      <span className={styles.authorDot} style={{ backgroundColor: participant.color }} />
      {isHost && "👑 "}
      {participant.username}
      {isAdmin && (
        <>
          <button
            className={styles.chipBtn}
            onClick={() => setEditing(true)}
            title="Rename"
            aria-label={`Rename ${participant.username}`}
          >
            ✎
          </button>
          {!isHost && (
            <button
              className={`${styles.chipBtn} ${styles.chipRemoveBtn}`}
              onClick={onRemove}
              title="Remove"
              aria-label={`Remove ${participant.username}`}
            >
              ✕
            </button>
          )}
        </>
      )}
    </span>
  );
}

interface GroupLabelProps {
  name: string | null;
  isAdmin: boolean;
  onRename: (name: string) => void;
}

function GroupLabel({ name, isAdmin, onRename }: GroupLabelProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className={styles.groupLabelEditing}>
        <InlineEditor
          initialValue={name ?? ""}
          maxLength={100}
          allowEmpty
          ariaLabel="Rename group"
          onSave={(value) => {
            if (value !== (name ?? "")) onRename(value);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className={styles.groupLabel}>
      <span>{name || "Group"}</span>
      {isAdmin && (
        <button
          className={styles.groupEditBtn}
          onClick={() => setEditing(true)}
          title="Rename group"
          aria-label="Rename group"
        >
          ✎
        </button>
      )}
    </div>
  );
}

interface NoteCardProps {
  note: SnapshotNote;
  isAdmin: boolean;
  onSave: (content: string) => void;
  onDelete: () => void;
}

function NoteCard({ note, isAdmin, onSave, onDelete }: NoteCardProps) {
  const [editing, setEditing] = useState(false);

  return (
    <div className={styles.noteCard} style={{ borderLeftColor: note.authorColor }}>
      {editing ? (
        <InlineEditor
          initialValue={note.content}
          multiline
          maxLength={500}
          ariaLabel="Edit note"
          onSave={(content) => {
            if (content !== note.content) onSave(content);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <div className={styles.noteContent}>{note.content}</div>
      )}
      {isAdmin && !editing && (
        <span className={styles.noteControls}>
          <button
            className={styles.iconBtn}
            onClick={() => setEditing(true)}
            title="Edit note"
            aria-label="Edit note"
          >
            ✎
          </button>
          <button
            className={styles.deleteBtn}
            onClick={onDelete}
            title="Delete note"
            aria-label="Delete note"
          >
            ✕
          </button>
        </span>
      )}
      <div className={styles.noteFooter}>
        <span className={styles.authorDot} style={{ backgroundColor: note.authorColor }} />
        <span className={styles.authorName}>{note.authorName}</span>
      </div>
    </div>
  );
}

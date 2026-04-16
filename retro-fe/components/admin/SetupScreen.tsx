"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import styles from "./SetupScreen.module.css";
import { LobbyPanel } from "@/components/ui/LobbyPanel";
import type { BoardColumn, Participant } from "@/lib/types";

const COLUMN_COLORS = [
  "#7c6af5", "#4caf80", "#e8b86d", "#e06060",
  "#5bc4d4", "#e07a5f", "#3d7ebf", "#c97db5",
];

const TIMER_OPTIONS = [
  { label: "3 min",  value: 180 },
  { label: "5 min",  value: 300 },
  { label: "10 min", value: 600 },
  { label: "15 min", value: 900 },
];

interface SetupScreenProps {
  roomCode: string;
  sessionToken: string;
  columns: BoardColumn[];
  timerSeconds: number;
  participants: Participant[];
  onStartSession: () => void;
  isStarting: boolean;
}

// Sortable column row
function SortableColumnItem({
  column,
  onDelete,
}: {
  column: BoardColumn;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={styles.columnItem}>
      <span className={styles.dragHandle} {...attributes} {...listeners}>
        ⠿
      </span>
      <span className={styles.columnDot} style={{ backgroundColor: column.color }} />
      <span className={styles.columnTitle}>{column.title}</span>
      <button
        type="button"
        className={styles.deleteBtn}
        onClick={() => onDelete(column.id)}
        title="Remove column"
      >
        ×
      </button>
    </div>
  );
}

export function SetupScreen({
  roomCode,
  sessionToken,
  columns,
  timerSeconds,
  participants,
  onStartSession,
  isStarting,
}: SetupScreenProps) {
  const [newTitle, setNewTitle] = useState("");
  const [newColor, setNewColor] = useState(COLUMN_COLORS[0]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Add column
  async function handleAddColumn() {
    if (!newTitle.trim() || adding) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/columns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Token": sessionToken,
        },
        body: JSON.stringify({ title: newTitle.trim(), color: newColor }),
      });
      if (!res.ok) throw new Error("Failed to add column");
      setNewTitle("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add column");
    } finally {
      setAdding(false);
    }
  }

  // Delete column
  const handleDelete = useCallback(
    async (columnId: string) => {
      try {
        await fetch(
          `/api/rooms/${encodeURIComponent(roomCode)}/columns/${encodeURIComponent(columnId)}`,
          {
            method: "DELETE",
            headers: { "X-Session-Token": sessionToken },
          }
        );
      } catch {
        // WS broadcast will sync state; ignore transient errors
      }
    },
    [roomCode, sessionToken]
  );

  // Drag end — reorder
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = columns.findIndex((c) => c.id === active.id);
    const newIndex = columns.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(columns, oldIndex, newIndex);

    // Patch position for the moved column
    const movedColumn = reordered[newIndex];
    try {
      await fetch(
        `/api/rooms/${encodeURIComponent(roomCode)}/columns/${encodeURIComponent(movedColumn.id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-Session-Token": sessionToken,
          },
          body: JSON.stringify({ position: newIndex }),
        }
      );
    } catch {
      // WS broadcast will correct state
    }
  }

  // Set timer
  async function handleTimerChange(seconds: number) {
    try {
      await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/timer`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Token": sessionToken,
        },
        body: JSON.stringify({ timerSeconds: seconds }),
      });
    } catch {
      // ignore
    }
  }

  return (
    <div className={styles.layout}>
      {/* Main area */}
      <div className={styles.main}>
        {/* Columns card */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>Board Columns</div>

          {/* Add form */}
          <div className={styles.addForm}>
            <input
              className={styles.titleInput}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Column name…"
              maxLength={60}
              onKeyDown={(e) => e.key === "Enter" && handleAddColumn()}
            />
            <div className={styles.colorPicker}>
              {COLUMN_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`${styles.colorSwatch} ${
                    c === newColor ? styles.colorSwatchSelected : ""
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setNewColor(c)}
                  title={c}
                />
              ))}
            </div>
            <button
              type="button"
              className={styles.addBtn}
              disabled={!newTitle.trim() || adding}
              onClick={handleAddColumn}
            >
              {adding ? "Adding…" : "+ Add Column"}
            </button>
          </div>

          {error && (
            <div style={{ color: "var(--red)", fontSize: "0.8rem", marginTop: 8 }}>
              {error}
            </div>
          )}

          {/* Sortable column list */}
          {columns.length === 0 ? (
            <div className={styles.emptyColumns}>
              No columns yet — add one above.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={columns.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className={styles.columnList}>
                  {columns.map((col) => (
                    <SortableColumnItem
                      key={col.id}
                      column={col}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Timer card */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>Writing Timer</div>
          <div className={styles.timerOptions}>
            {TIMER_OPTIONS.map(({ label, value }) => (
              <button
                key={value}
                type="button"
                className={`${styles.timerBtn} ${
                  timerSeconds === value ? styles.timerBtnActive : ""
                }`}
                onClick={() => handleTimerChange(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className={styles.sidebar}>
        <LobbyPanel participants={participants} />

        <button
          type="button"
          className={styles.startBtn}
          disabled={columns.length === 0 || isStarting}
          onClick={onStartSession}
        >
          {isStarting ? "Starting…" : "▶ Start Session"}
        </button>
        {columns.length === 0 && (
          <div className={styles.startHint}>Add at least one column to start.</div>
        )}
      </div>
    </div>
  );
}

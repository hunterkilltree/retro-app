"use client";

import { useEffect, useState } from "react";
import styles from "./TopBar.module.css";
import type { BoardState, Participant } from "@/lib/types";
import ConfirmDialog from "./ConfirmDialog";

interface TopBarProps {
  roomCode: string;
  state: BoardState;
  me: Participant;
  sessionToken: string;
  onRoomDeleted?: () => void;
}

export function TopBar({ roomCode, state, me, sessionToken, onRoomDeleted }: TopBarProps) {
  const [copied, setCopied] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Sync theme from html element on mount
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") {
      document.documentElement.setAttribute("data-mode", "dark");
      setIsDark(true);
    }
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.setAttribute("data-mode", next ? "dark" : "light");
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  async function handleDeleteRoom() {
    setDeleting(true);
    try {
      await fetch(`/api/rooms/${roomCode}`, {
        method: "DELETE",
        headers: { "X-Session-Token": sessionToken },
      });
      // WS will receive ROOM_CLOSED and redirect; but if admin's WS is closed by then, redirect here too
      onRoomDeleted?.();
    } catch {
      // best-effort — WS broadcast will handle redirect for everyone else
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select URL bar
    }
  }

  const stateLabel: Record<BoardState, string> = {
    SETUP: "Setup",
    START: "Writing",
    REVIEW: "Review",
    DONE: "Done",
  };

  const initials = me.username.slice(0, 2).toUpperCase();

  return (
    <header className={styles.bar}>
      {/* Logo */}
      <span className={styles.logo}>Retro</span>

      {/* State badge */}
      <span className={`${styles.stateBadge} ${styles[`state${state}`]}`}>
        {stateLabel[state]}
      </span>

      <div className={styles.spacer} />

      {/* Room code + copy */}
      <div className={styles.roomCode}>
        {roomCode}
        <button
          type="button"
          className={`${styles.copyBtn} ${copied ? styles.copyBtnCopied : ""}`}
          onClick={copyUrl}
          title="Copy room link"
        >
          {copied ? "✓ Copied" : "Copy link"}
        </button>
      </div>

      {/* Identity */}
      <div className={styles.identity}>
        <div
          className={styles.avatar}
          style={{ backgroundColor: me.color }}
          title={me.username}
        >
          {initials}
        </div>
        <span className={styles.username}>{me.username}</span>
        {me.role === "ADMIN" && (
          <span className={styles.adminBadge}>👑 Admin</span>
        )}
      </div>

      {/* Delete Room (admin only) */}
      {me.role === "ADMIN" && (
        <button
          type="button"
          className={styles.deleteBtn}
          onClick={() => setShowDeleteDialog(true)}
          title="Delete room and all data"
        >
          🗑 Delete Room
        </button>
      )}

      {/* Theme toggle */}
      <button
        type="button"
        className={styles.themeBtn}
        onClick={toggleTheme}
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        aria-label="Toggle theme"
      >
        {isDark ? "☀️" : "🌙"}
      </button>

      {/* Confirmation dialog */}
      {showDeleteDialog && (
        <ConfirmDialog
          title="Delete Room"
          message={`Are you sure you want to delete room "${roomCode}"? This will permanently remove all notes, groups, and action items and disconnect all participants.`}
          confirmLabel={deleting ? "Deleting…" : "Yes, delete"}
          cancelLabel="Cancel"
          dangerous
          onConfirm={handleDeleteRoom}
          onCancel={() => setShowDeleteDialog(false)}
        />
      )}
    </header>
  );
}

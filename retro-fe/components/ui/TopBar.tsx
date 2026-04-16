"use client";

import { useEffect, useState } from "react";
import styles from "./TopBar.module.css";
import type { BoardState, Participant } from "@/lib/types";

interface TopBarProps {
  roomCode: string;
  state: BoardState;
  me: Participant;
}

export function TopBar({ roomCode, state, me }: TopBarProps) {
  const [copied, setCopied] = useState(false);
  const [isDark, setIsDark] = useState(false);

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
    </header>
  );
}

import styles from "./LobbyPanel.module.css";
import type { Participant } from "@/lib/types";

interface LobbyPanelProps {
  participants: Participant[];
}

export function LobbyPanel({ participants }: LobbyPanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.title}>
        In the room · {participants.length}
      </div>
      <div className={styles.list}>
        {participants.length === 0 ? (
          <span className={styles.empty}>No one here yet…</span>
        ) : (
          participants.map((p) => (
            <div key={p.id} className={styles.participant}>
              <div
                className={styles.avatar}
                style={{ backgroundColor: p.color }}
                title={p.username}
              >
                {p.username.slice(0, 2).toUpperCase()}
              </div>
              <span className={styles.name}>{p.username}</span>
              {p.role === "ADMIN" && (
                <span className={styles.crown} title="Admin">👑</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

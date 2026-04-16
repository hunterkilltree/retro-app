import styles from "./SkeletonNote.module.css";

interface SkeletonNoteProps {
  authorColor: string;
}

export function SkeletonNote({ authorColor }: SkeletonNoteProps) {
  return (
    <div className={styles.card} style={{ borderLeftColor: authorColor }}>
      <div className={styles.line} style={{ width: "85%" }} />
      <div className={styles.line} style={{ width: "60%" }} />
      <div className={styles.footer}>
        <span className={styles.authorDot} style={{ backgroundColor: authorColor }} />
      </div>
    </div>
  );
}

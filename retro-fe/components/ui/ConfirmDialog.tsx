"use client";

import type { ReactNode } from "react";
import styles from "./ConfirmDialog.module.css";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  dangerous?: boolean;
  /** Extra content (e.g. an option checkbox) rendered below the message. */
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  dangerous = false,
  children,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.dialog}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>{message}</p>
        {children}
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={dangerous ? styles.dangerBtn : styles.confirmBtn}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

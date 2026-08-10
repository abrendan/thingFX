import React, { useEffect } from 'react'
import styles from './ConfirmDialog.module.css'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

// Full-screen confirmation for destructive actions (e.g. shutting down
// the PC). Captures all key input while open so the app's global dial
// and button handlers don't fire: Enter confirms, Escape (back button)
// cancels.
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel
}) => {
  useEffect(() => {
    if (!open) return
    const listener = (e: KeyboardEvent) => {
      e.stopImmediatePropagation()
      e.preventDefault()
      if (e.repeat) return
      if (e.key === 'Enter' || e.key === ' ') onConfirm()
      else if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', listener, { capture: true })
    return () =>
      document.removeEventListener('keydown', listener, { capture: true })
  }, [open, onConfirm, onCancel])

  if (!open) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <p className={styles.title}>{title}</p>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button className={styles.cancel} onClick={onCancel}>
            Cancel
          </button>
          <button className={styles.confirm} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog

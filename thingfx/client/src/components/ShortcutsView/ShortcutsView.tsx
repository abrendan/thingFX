import { useContext, useEffect, useState } from 'react'
import { SocketContext } from '@/contexts/SocketContext.tsx'
import styles from './ShortcutsView.module.css'

interface App {
  id: string
  name?: string
  command?: string
}

interface ShortcutsViewProps {
  onShutdownRequest?: () => void
}

const ShortcutsView: React.FC<ShortcutsViewProps> = ({ onShutdownRequest }) => {
  const { ready, socket } = useContext(SocketContext)
  const [apps, setApps] = useState<App[] | null>(null)
  const [images, setImages] = useState<Record<string, string>>({})
  const [showLock, setShowLock] = useState(false)
  const [showShutdown, setShowShutdown] = useState(false)

  function openApp(id: string) {
    socket?.send(JSON.stringify({ type: 'apps', action: 'open', data: id }))
  }

  function lock() {
    socket?.send(JSON.stringify({ type: 'lock' }))
  }

  useEffect(() => {
    if (!ready || !socket) return

    const listener = (e: MessageEvent) => {
      const { type, action, data } = JSON.parse(e.data)
      if (type === 'lockshortcut') {
        setShowLock(data === true)
        return
      }
      if (type === 'shutdownshortcut') {
        setShowShutdown(data === true)
        return
      }
      if (type !== 'apps') return
      if (action === 'image') {
        setImages(prev => ({ ...prev, [data.id]: data.image }))
      } else {
        setApps(data)
        for (const app of data) {
          socket.send(JSON.stringify({ type: 'apps', action: 'image', data: app.id }))
        }
      }
    }

    socket.addEventListener('message', listener)
    socket.send(JSON.stringify({ type: 'apps' }))
    socket.send(JSON.stringify({ type: 'lockshortcut' }))
    socket.send(JSON.stringify({ type: 'shutdownshortcut' }))

    return () => socket.removeEventListener('message', listener)
  }, [ready, socket])

  // Size tiles dynamically: few shortcuts = big tiles filling the screen
  const count = Math.max(
    (apps?.length ?? 0) + (showLock ? 1 : 0) + (showShutdown ? 1 : 0),
    1
  )
  const fill = apps !== null && count <= 8
  const cols = count <= 4 ? count : 4
  const rows = Math.ceil(count / cols)
  const gridStyle = fill
    ? { gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }
    : undefined

  return (
    <div className={styles.view}>
      <p className={styles.heading}>Apps</p>

      <div className={`${styles.grid}${fill ? ` ${styles.gridFill}` : ''}`} data-big={fill && count <= 4} style={gridStyle}>
        {/* App shortcuts from server */}
        {apps && apps.length > 0 ? (
          apps.map(app => (
            <button
              key={app.id}
              className={styles.appBtn}
              onClick={() => openApp(app.id)}
              aria-label={app.name || 'App'}
            >
              {images[app.id] ? (
                <span className={styles.iconWrap}>
                  <img src={images[app.id]} alt="" className={styles.appIcon} />
                </span>
              ) : (
                <span className="material-icons">rocket_launch</span>
              )}
              <span className={styles.appLabel}>{app.name || 'App'}</span>
            </button>
          ))
        ) : apps && apps.length === 0 ? (
          <div className={styles.empty}>
            <span className="material-icons">workspaces</span>
            <p>No shortcuts yet</p>
            <p className={styles.hint}>Add them in the desktop app</p>
          </div>
        ) : null}

        {showLock && (
          <button
            className={`${styles.appBtn} ${styles.lockBtn}`}
            onClick={lock}
            aria-label="Lock"
          >
            <span className="material-icons">lock</span>
            <span className={styles.appLabel}>Lock</span>
          </button>
        )}

        {showShutdown && (
          <button
            className={`${styles.appBtn} ${styles.lockBtn}`}
            onClick={() => onShutdownRequest?.()}
            aria-label="Shut Down"
          >
            <span className="material-icons">power_settings_new</span>
            <span className={styles.appLabel}>Shut Down</span>
          </button>
        )}
      </div>
    </div>
  )
}

export default ShortcutsView

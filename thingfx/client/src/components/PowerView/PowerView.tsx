import { useContext, useState } from 'react'
import { SocketContext } from '@/contexts/SocketContext.tsx'
import styles from './PowerView.module.css'

const PowerView: React.FC = () => {
  const { socket } = useContext(SocketContext)
  const [rebooting, setRebooting] = useState(false)

  function reboot() {
    if (rebooting) return
    setRebooting(true)
    socket?.send(JSON.stringify({ type: 'reboot' }))
  }

  return (
    <div className={styles.view}>
      <p className={styles.heading}>
        <span className="material-icons">power_settings_new</span>
        Power
      </p>

      <div className={styles.center}>
        <button
          className={styles.rebootBtn}
          onClick={reboot}
          disabled={rebooting}
        >
          <span className="material-icons">restart_alt</span>
          {rebooting ? 'Rebooting...' : 'Reboot'}
        </button>
        <p className={styles.hint}>
          {rebooting
            ? 'The Car Thing will restart in a moment.'
            : 'Restarts the Car Thing.'}
        </p>
      </div>

      <span className={styles.version}>v{__VERSION__}</span>
    </div>
  )
}

export default PowerView

import React from 'react'
import styles from './VolumeOverlay.module.css'

const R = 136
const SW = 16
const W = R + SW / 2   // 144 — circle center sits at right edge
const H = 2 * R + SW   // 288
const ARC = Math.PI * R

const arcPath = `M ${W} ${SW / 2} A ${R} ${R} 0 0 0 ${W} ${H - SW / 2}`

interface VolumeOverlayProps {
  volume: number
  visible: boolean
  maxed?: boolean
  /** Hide the icon/percentage text (e.g. when a large thumbnail sits nearby) */
  showText?: boolean
}

const VolumeOverlay: React.FC<VolumeOverlayProps> = ({ volume, visible, maxed = false, showText = true }) => (
  <div className={styles.overlay} data-visible={visible} data-maxed={maxed} aria-hidden>
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {/* D-shaped background fill */}
      <path d={`${arcPath} Z`} className={styles.bg} />
      {/* Track arc */}
      <path
        d={arcPath}
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={SW}
        strokeLinecap="round"
      />
      {/* Volume fill arc */}
      <path
        d={arcPath}
        fill="none"
        strokeWidth={SW}
        strokeLinecap={volume > 0 ? 'round' : 'butt'}
        strokeDasharray={`${(volume / 100) * ARC} ${ARC}`}
        className={styles.fill}
      />
    </svg>
    {showText && (
      <div className={styles.content}>
        <span className="material-icons">
          {volume === 0 ? 'volume_off' : volume < 50 ? 'volume_down' : 'volume_up'}
        </span>
        <span className={styles.pct}>{Math.round(volume)}</span>
        {maxed && <span className={styles.maxLabel}>MAX</span>}
      </div>
    )}
  </div>
)

export default VolumeOverlay

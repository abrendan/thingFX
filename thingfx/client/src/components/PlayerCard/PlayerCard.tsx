import React, { useContext, useEffect, useRef, useState } from 'react'
import { MediaContext } from '@/contexts/MediaContext.tsx'
import { RepeatMode } from '@/types/Playback.js'
import Visualizer from '@/components/Visualizer/Visualizer.tsx'
import styles from './PlayerCard.module.css'

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface PlayerCardProps {
  showVisualizer?: boolean
}

const PlayerCard: React.FC<PlayerCardProps> = ({ showVisualizer = true }) => {
  const { playerData, image, actions } = useContext(MediaContext)
  const [displayImage, setDisplayImage] = useState<string | null>(null)
  const [imgVisible, setImgVisible] = useState(false)
  const [showVolume, setShowVolume] = useState(false)
  const volumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // clean crossfade on track change
  useEffect(() => {
    if (!image) return
    if (image === displayImage) return
    setImgVisible(false)
    const t = setTimeout(() => {
      setDisplayImage(image)
      setImgVisible(true)
    }, 200)
    return () => clearTimeout(t)
  }, [image])

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    actions.setVolume(Number(e.target.value))
    setShowVolume(true)
    if (volumeTimer.current) clearTimeout(volumeTimer.current)
    volumeTimer.current = setTimeout(() => setShowVolume(false), 1800)
  }

  const cycleRepeat = () => {
    if (!playerData) return
    const next: Record<RepeatMode, RepeatMode> = { off: 'on', on: 'one', one: 'off' }
    actions.repeat(next[playerData.repeat])
  }

  const progress = playerData
    ? playerData.track.duration.current / playerData.track.duration.total
    : 0

  const isPlaying = playerData?.isPlaying ?? false
  const canShuffle = playerData?.supportedActions.includes('shuffle') ?? false
  const canRepeat = playerData?.supportedActions.includes('repeat') ?? false

  return (
    <div className={styles.card}>
      {/* Album Art */}
      <div className={styles.artWrapper}>
        {displayImage ? (
          <img
            src={displayImage}
            alt=""
            className={styles.art}
            data-visible={imgVisible}
          />
        ) : (
          <div className={styles.artPlaceholder}>
            <span className="material-icons">music_note</span>
          </div>
        )}
      </div>

      {/* Track Info + Controls */}
      <div className={styles.right}>
        <div className={styles.trackInfo}>
          <p className={styles.trackName}>
            {playerData?.track.name ?? 'Nothing playing'}
          </p>
          <p className={styles.artists}>
            {playerData?.track.artists.join(', ') ?? '—'}
          </p>
          <p className={styles.album}>
            {playerData?.track.album ?? ''}
          </p>
        </div>

        {/* Progress */}
        <div className={styles.progressSection}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${Math.min(progress * 100, 100)}%` }}
            />
          </div>
          <div className={styles.times}>
            <span>{playerData ? formatTime(playerData.track.duration.current) : '0:00'}</span>
            <span>{playerData ? formatTime(playerData.track.duration.total) : '0:00'}</span>
          </div>
        </div>

        {/* Controls */}
        <div className={styles.controls}>
          <button
            className={styles.secondaryBtn}
            data-active={playerData?.shuffle}
            onClick={() => actions.shuffle(!playerData?.shuffle)}
            disabled={!canShuffle}
            aria-label="Shuffle"
          >
            <span className="material-icons">shuffle</span>
          </button>

          <button
            className={styles.controlBtn}
            onClick={actions.skipBackward}
            disabled={!playerData?.supportedActions.includes('previous')}
            aria-label="Previous"
          >
            <span className="material-icons">skip_previous</span>
          </button>

          <button
            className={styles.playBtn}
            onClick={actions.playPause}
            disabled={!playerData}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            <span className="material-icons">
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>

          <button
            className={styles.controlBtn}
            onClick={actions.skipForward}
            disabled={!playerData?.supportedActions.includes('next')}
            aria-label="Next"
          >
            <span className="material-icons">skip_next</span>
          </button>

          <button
            className={styles.secondaryBtn}
            data-active={playerData?.repeat !== 'off'}
            onClick={cycleRepeat}
            disabled={!canRepeat}
            aria-label="Repeat"
          >
            <span className="material-icons">
              {playerData?.repeat === 'one' ? 'repeat_one' : 'repeat'}
            </span>
          </button>
        </div>

        {/* Volume + Visualizer row */}
        <div className={styles.bottom}>
          <div className={styles.volumeRow} data-visible={showVolume || !isPlaying}>
            <span className="material-icons" style={{ fontSize: 14, opacity: 0.5 }}>volume_down</span>
            <input
              type="range"
              min={0}
              max={100}
              value={playerData?.volume ?? 50}
              onChange={handleVolumeChange}
              className={styles.volumeSlider}
              aria-label="Volume"
            />
            <span className="material-icons" style={{ fontSize: 14, opacity: 0.5 }}>volume_up</span>
          </div>
          {showVisualizer && <Visualizer isPlaying={isPlaying} />}
        </div>
      </div>
    </div>
  )
}

export default PlayerCard

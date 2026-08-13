import React, { useContext, useEffect, useRef, useState } from 'react'
import { MediaContext } from '@/contexts/MediaContext.tsx'
import { SocketContext } from '@/contexts/SocketContext.tsx'
import { RepeatMode } from '@/types/Playback.js'
import VolumeOverlay from '@/components/VolumeOverlay/VolumeOverlay.tsx'
import Visualizer from '@/components/Visualizer/Visualizer.tsx'
import ScrollText from '@/components/ScrollText/ScrollText.tsx'
import { BgStyle } from '@/components/Background/Background.tsx'
import styles from './NowPlaying.module.css'

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${m}:${(s % 60).toString().padStart(2, '0')}`
}

interface NowPlayingProps {
  showVisualizer?: boolean
  bgStyle?: BgStyle
  wheelMode?: 'volume' | 'scrub' | 'volume-native'
}

const NowPlaying: React.FC<NowPlayingProps> = ({ showVisualizer = true, bgStyle = 'full', wheelMode = 'volume' }) => {
  const { playerData, playerDataRef, actions } = useContext(MediaContext)
  const { socket } = useContext(SocketContext)

  const [liked, setLiked] = useState(false)
  const [likedTrackId, setLikedTrackId] = useState<string | null>(null)

  const [volume, setVolume] = useState(0)
  const volumeRef = useRef(volume)
  const lastVolumeChange = useRef(0)
  const [volumeVisible, setVolumeVisible] = useState(false)
  const volumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [volMaxed, setVolMaxed] = useState(false)
  const volMaxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flashVolume = () => {
    setVolumeVisible(true)
    if (volumeTimerRef.current) clearTimeout(volumeTimerRef.current)
    volumeTimerRef.current = setTimeout(() => setVolumeVisible(false), 2000)
  }

  const flashMaxed = () => {
    setVolMaxed(true)
    if (volMaxTimerRef.current) clearTimeout(volMaxTimerRef.current)
    volMaxTimerRef.current = setTimeout(() => setVolMaxed(false), 1600)
  }

  const cycleRepeat = () => {
    if (!playerData) return
    const map: Record<RepeatMode, RepeatMode> = { off: 'on', on: 'one', one: 'off' }
    actions.repeat(map[playerData.repeat])
  }

  function volumeUp() {
    if (playerDataRef.current === null) return
    if (!playerDataRef.current.supportedActions.includes('volume')) return
    if (volumeRef.current >= 100) { flashMaxed(); return }
    const newVolume = Math.min(volumeRef.current + 10, 100)
    actions.setVolume(newVolume)
    setVolume(newVolume)
    volumeRef.current = newVolume
    lastVolumeChange.current = Date.now()
    flashVolume()
  }

  function volumeDown() {
    if (playerDataRef.current === null) return
    if (!playerDataRef.current.supportedActions.includes('volume')) return
    if (volumeRef.current <= 0) return
    const newVolume = Math.max(volumeRef.current - 10, 0)
    actions.setVolume(newVolume)
    setVolume(newVolume)
    volumeRef.current = newVolume
    lastVolumeChange.current = Date.now()
    flashVolume()
  }

  // Check liked status when track changes
  useEffect(() => {
    const id = playerData?.track.id ?? null
    if (!id || !socket) return
    if (id === likedTrackId) return
    setLikedTrackId(id)
    setLiked(false)
    socket.send(JSON.stringify({ type: 'library', action: 'check-liked', data: { ids: [id] } }))
  }, [playerData?.track.id, socket])

  // Listen for liked status and like_result
  useEffect(() => {
    if (!socket) return
    const listener = (e: MessageEvent) => {
      const msg = JSON.parse(e.data)
      if (msg.type !== 'library') return
      if (msg.action === 'liked-status') {
        const { ids, status } = msg.data ?? {}
        if (Array.isArray(ids) && Array.isArray(status) && ids[0] === playerData?.track.id) {
          setLiked(status[0] ?? false)
        }
      } else if (msg.action === 'like_result') {
        if (msg.data?.id === playerData?.track.id) setLiked(msg.data.state)
      }
    }
    socket.addEventListener('message', listener)
    return () => socket.removeEventListener('message', listener)
  }, [socket, playerData?.track.id])

  function toggleLike() {
    const id = playerData?.track.id
    if (!id || !socket) return
    const newState = !liked
    setLiked(newState)
    socket.send(JSON.stringify({ type: 'library', action: 'like', data: { id, state: newState } }))
  }

  // Sync volume from server unless user changed it in the last second
  useEffect(() => {
    if (!playerData) return
    if (lastVolumeChange.current < Date.now() - 1000) {
      setVolume(playerData.volume)
      volumeRef.current = playerData.volume
    }
  }, [playerData])

  function scrub(direction: 1 | -1) {
    if (playerDataRef.current === null) return
    if (!playerDataRef.current.supportedActions.includes('seek')) return
    const { current, total } = playerDataRef.current.track.duration
    if (total <= 0) return
    actions.seek(Math.max(0, Math.min(current + direction * 5000, total)))
  }

  // Wheel listener — no dep array so closures stay fresh every render
  useEffect(() => {
    const listener = (e: globalThis.WheelEvent) => {
      e.preventDefault()
      if (wheelMode === 'scrub') {
        if (e.deltaX < 0) scrub(-1)
        else if (e.deltaX > 0) scrub(1)
        return
      }
      if (wheelMode === 'volume-native') {
        // Adjust the PC's system volume instead of the player's
        const direction = e.deltaX < 0 ? 'down' : e.deltaX > 0 ? 'up' : null
        if (direction)
          socket?.send(JSON.stringify({ type: 'sysvolume', data: direction }))
        return
      }
      if (e.deltaX < 0) volumeDown()
      else if (e.deltaX > 0) volumeUp()
    }
    document.addEventListener('wheel', listener, { passive: false })
    return () => document.removeEventListener('wheel', listener)
  })

  const isPlaying   = playerData?.isPlaying ?? false
  const current     = playerData?.track.duration.current ?? 0
  const total       = playerData?.track.duration.total ?? 0
  const pct         = total > 0 ? Math.min(current / total, 1) * 100 : 0
  const remaining   = Math.max(total - current, 0)
  const canPrev    = playerData?.supportedActions.includes('previous') ?? false
  const canNext    = playerData?.supportedActions.includes('next') ?? false
  const canShuffle = playerData?.supportedActions.includes('shuffle') ?? false
  const canRepeat  = playerData?.supportedActions.includes('repeat') ?? false

  return (
    <div className={styles.screen}>
      <VolumeOverlay
        volume={volume}
        visible={volumeVisible || volMaxed}
        maxed={volMaxed}
        showText={bgStyle !== 'thumbnail-lg'}
      />

      {/* ── Top: track info + visualizer ── */}
      <div className={`${styles.top}${bgStyle === 'thumbnail' || bgStyle === 'thumbnail-blur' ? ` ${styles.topThumbnail}` : ''}${bgStyle === 'thumbnail-lg' ? ` ${styles.topThumbnailLg}` : ''}`}>
        <div className={styles.info}>
          <ScrollText className={styles.source}>
            {playerData?.track.album ?? 'thingFX'}
          </ScrollText>
          <ScrollText className={styles.trackName}>
            {playerData?.track.name ?? 'Nothing Playing'}
          </ScrollText>
          <ScrollText className={styles.artist}>
            {playerData?.track.artists.join(', ') ?? '—'}
          </ScrollText>
        </div>
      </div>

      {/* ── Visualizer (below artist, above progress) ── */}
      <div className={`${styles.visualizerRow}${bgStyle === 'thumbnail' || bgStyle === 'thumbnail-blur' ? ` ${styles.visualizerRowThumbnail}` : ''}${bgStyle === 'thumbnail-lg' ? ` ${styles.visualizerRowThumbnailLg}` : ''}`}>
        {showVisualizer && <Visualizer isPlaying={isPlaying} />}
      </div>

      {/* ── Progress bar ── */}
      <div className={`${styles.progress}${bgStyle === 'thumbnail-lg' ? ` ${styles.progressThumbnailLg}` : ''}`}>
        <span className={styles.progressTime}>{formatMs(current)}</span>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${pct}%` }} />
        </div>
        <span className={styles.progressTime}>-{formatMs(remaining)}</span>
      </div>

      {/* ── Divider ── */}
      <div className={styles.divider} />

      {/* ── Controls row ── */}
      <div className={styles.controls}>

        <button
          className={styles.btn}
          data-active={playerData?.shuffle}
          onClick={() => actions.shuffle(!playerData?.shuffle)}
          disabled={!canShuffle}
          aria-label="Shuffle"
        >
          <span className="material-icons">shuffle</span>
        </button>

        <button
          className={styles.btn}
          onClick={actions.skipBackward}
          disabled={!canPrev}
          aria-label="Previous"
        >
          <span className="material-icons">skip_previous</span>
        </button>

        <button
          className={`${styles.btn} ${styles.playBtn}`}
          onClick={actions.playPause}
          disabled={!playerData}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          <span className="material-icons">
            {isPlaying ? 'pause' : 'play_arrow'}
          </span>
        </button>

        <button
          className={styles.btn}
          onClick={actions.skipForward}
          disabled={!canNext}
          aria-label="Next"
        >
          <span className="material-icons">skip_next</span>
        </button>

        <button
          className={styles.btn}
          data-active={playerData?.repeat !== 'off'}
          onClick={cycleRepeat}
          disabled={!canRepeat}
          aria-label="Repeat"
        >
          <span className="material-icons">
            {playerData?.repeat === 'one' ? 'repeat_one' : 'repeat'}
          </span>
        </button>

        <button
          className={`${styles.btn} ${styles.likeBtn}`}
          data-active={liked}
          onClick={toggleLike}
          disabled={!playerData?.track.id}
          aria-label="Like"
        >
          <span className="material-icons">
            {liked ? 'favorite' : 'favorite_border'}
          </span>
        </button>

      </div>
    </div>
  )
}

export default NowPlaying

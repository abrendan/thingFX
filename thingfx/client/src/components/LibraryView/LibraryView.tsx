import React, { useContext, useEffect, useRef, useState } from 'react'
import { SocketContext } from '@/contexts/SocketContext.tsx'
import styles from './LibraryView.module.css'

interface PlaylistItem { id: string; name: string; image: string | null; trackCount: number }
interface AlbumItem    { id: string; name: string; artist: string; image: string | null }
interface ArtistItem   { id: string; name: string; image: string | null }
interface TrackItem    { id: string; name: string; artist: string; uri: string }

type Section = 'playlists' | 'albums' | 'liked' | 'recent' | 'top' | 'artists'
type Screen =
  | { type: 'home' }
  | { type: 'list'; section: Section }
  | { type: 'tracks'; id: string; kind: 'playlist' | 'album' | 'artist'; title: string }

const HOME_SECTIONS: { section: Section; label: string; icon: string }[] = [
  { section: 'recent',    label: 'Recently Played', icon: 'access_time'  },
  { section: 'top',       label: 'Top Tracks',       icon: 'grade'        },
  { section: 'playlists', label: 'Playlists',        icon: 'queue_music'  },
  { section: 'albums',    label: 'Albums',           icon: 'album'        },
  { section: 'artists',   label: 'Artists',          icon: 'person'       },
  { section: 'liked',     label: 'Liked Songs',      icon: 'favorite'     },
]

const SwipeRow: React.FC<{
  onClick: () => void
  onSwipeLeft: () => void
  queued: boolean
  children: React.ReactNode
}> = ({ onClick, onSwipeLeft, queued, children }) => {
  const startX = useRef(0)
  const swiped = useRef(false)
  return (
    <div
      className={`${styles.row} ${queued ? styles.rowQueued : ''}`}
      onTouchStart={e => { startX.current = e.touches[0].clientX; swiped.current = false }}
      onTouchEnd={e => {
        if (startX.current - e.changedTouches[0].clientX > 60) {
          swiped.current = true
          onSwipeLeft()
        }
      }}
      onMouseDown={() => { swiped.current = false }}
      onClick={() => { if (!swiped.current) onClick() }}
    >
      {children}
      {queued && <span className={styles.queuedLabel}>Queued</span>}
    </div>
  )
}

const LibraryView: React.FC = () => {
  const { socket } = useContext(SocketContext)
  const [screen, setScreen] = useState<Screen>({ type: 'home' })
  const [loading, setLoading] = useState(false)

  const [playlists, setPlaylists]       = useState<PlaylistItem[]>([])
  const [albums, setAlbums]             = useState<AlbumItem[]>([])
  const [liked, setLiked]               = useState<TrackItem[]>([])
  const [recentTracks, setRecentTracks] = useState<TrackItem[]>([])
  const [topTracks, setTopTracks]       = useState<TrackItem[]>([])
  const [artistList, setArtistList]     = useState<ArtistItem[]>([])
  const [tracks, setTracks]             = useState<TrackItem[]>([])
  const [queuedId, setQueuedId]         = useState<string | null>(null)
  const [likedStatus, setLikedStatus]   = useState<Record<string, boolean>>({})
  const [imageCache, setImageCache]     = useState<Record<string, string>>({})

  const timerRef        = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestedImages = useRef(new Set<string>())
  const screenRef       = useRef(screen)
  screenRef.current = screen

  function send(action: string, data?: unknown) {
    socket?.send(JSON.stringify({ type: 'library', action, data }))
  }

  function requestImages(urls: (string | null | undefined)[]) {
    const toFetch = urls.filter(url => url && !requestedImages.current.has(url)) as string[]
    toFetch.forEach((url, i) => {
      requestedImages.current.add(url)
      setTimeout(() => send('image', { url }), i * 80)
    })
  }

  useEffect(() => {
    if (!socket) return
    const listener = (e: MessageEvent) => {
      const msg = JSON.parse(e.data)
      if (msg.type !== 'library') return
      setLoading(false)
      if      (msg.action === 'playlists')    setPlaylists(msg.data ?? [])
      else if (msg.action === 'albums')       setAlbums(msg.data ?? [])
      else if (msg.action === 'liked')        setLiked(msg.data ?? [])
      else if (msg.action === 'recent')       setRecentTracks(msg.data ?? [])
      else if (msg.action === 'top')          setTopTracks(msg.data ?? [])
      else if (msg.action === 'artists')      setArtistList(msg.data ?? [])
      else if (msg.action === 'tracks')       setTracks(msg.data ?? [])
      else if (msg.action === 'image') {
        const { url, base64 } = msg.data ?? {}
        if (url && base64) setImageCache(prev => ({ ...prev, [url]: base64 }))
      }
      else if (msg.action === 'liked-status') {
        const { ids, status } = msg.data ?? {}
        if (Array.isArray(ids) && Array.isArray(status)) {
          setLikedStatus(prev => {
            const next = { ...prev }
            ids.forEach((id: string, i: number) => { next[id] = status[i] })
            return next
          })
        }
      }
      else if (msg.action === 'like_result') {
        setLikedStatus(prev => ({ ...prev, [msg.data.id]: msg.data.state }))
      }
    }
    socket.addEventListener('message', listener)
    return () => socket.removeEventListener('message', listener)
  }, [socket])

  useEffect(() => { requestImages(playlists.map(p => p.image)) }, [playlists])
  useEffect(() => { requestImages(albums.map(a => a.image)) }, [albums])
  useEffect(() => { requestImages(artistList.map(a => a.image)) }, [artistList])

  useEffect(() => {
    if (tracks.length > 0 && !loading) send('check-liked', { ids: tracks.map(t => t.id) })
  }, [tracks, loading])
  useEffect(() => {
    if (liked.length > 0) setLikedStatus(prev => { const n = { ...prev }; liked.forEach(t => { n[t.id] = true }); return n })
  }, [liked])
  useEffect(() => {
    if (recentTracks.length > 0 && !loading) send('check-liked', { ids: recentTracks.map(t => t.id) })
  }, [recentTracks, loading])
  useEffect(() => {
    if (topTracks.length > 0 && !loading) send('check-liked', { ids: topTracks.map(t => t.id) })
  }, [topTracks, loading])

  function openSection(section: Section) {
    setLoading(true)
    setScreen({ type: 'list', section })
    send(section)
  }

  function openTracks(id: string, kind: 'playlist' | 'album' | 'artist', title: string) {
    setLoading(true)
    setTracks([])
    setScreen({ type: 'tracks', id, kind, title })
    send('tracks', { id, type: kind })
  }

  function playTrack(uri: string) {
    const s = screenRef.current
    const contextUri = s.type === 'tracks'
      ? s.kind === 'playlist' ? `spotify:playlist:${s.id}`
      : s.kind === 'album'    ? `spotify:album:${s.id}`
      : undefined
      : undefined
    send('play', { uri, contextUri })
  }

  function queueTrack(uri: string, id: string) {
    send('queue', { uri })
    setQueuedId(id)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setQueuedId(null), 1500)
  }

  function toggleLike(id: string) {
    const newState = !likedStatus[id]
    setLikedStatus(prev => ({ ...prev, [id]: newState }))
    send('like', { id, state: newState })
  }

  function back() {
    if (screen.type === 'tracks') {
      if (screen.kind === 'album')       setScreen({ type: 'list', section: 'albums' })
      else if (screen.kind === 'artist') setScreen({ type: 'list', section: 'artists' })
      else                               setScreen({ type: 'list', section: 'playlists' })
    } else {
      setScreen({ type: 'home' })
    }
  }

  function Thumb({ url, fallbackIcon, circle }: { url: string | null; fallbackIcon: string; circle?: boolean }) {
    const src = url ? imageCache[url] : null
    return (
      <div className={`${styles.thumb} ${circle ? styles.thumbCircle : ''}`}>
        {src
          ? <img src={src} alt="" className={styles.thumbImg} />
          : <span className="material-icons">{fallbackIcon}</span>
        }
      </div>
    )
  }

  function TrackRow({ t }: { t: TrackItem }) {
    return (
      <SwipeRow onClick={() => playTrack(t.uri)} onSwipeLeft={() => queueTrack(t.uri, t.id)} queued={queuedId === t.id}>
        <div className={styles.thumb}><span className="material-icons">music_note</span></div>
        <div className={styles.info}>
          <p className={styles.name}>{t.name}</p>
          <p className={styles.sub}>{t.artist}</p>
        </div>
        <button className={styles.likeBtn} onMouseDown={e => { e.stopPropagation(); toggleLike(t.id) }}>
          <span className="material-icons" style={{ color: likedStatus[t.id] ? '#1db954' : 'rgba(255,255,255,0.2)' }}>
            {likedStatus[t.id] ? 'favorite' : 'favorite_border'}
          </span>
        </button>
      </SwipeRow>
    )
  }

  const titleMap: Record<Section, string> = {
    playlists: 'Playlists', albums: 'Albums', liked: 'Liked Songs',
    recent: 'Recently Played', top: 'Top Tracks', artists: 'Artists',
  }

  if (screen.type === 'home') {
    return (
      <div className={styles.view}>
        <p className={styles.heading}>Library</p>
        <div className={styles.homeList}>
          {HOME_SECTIONS.map(({ section, label, icon }) => (
            <button key={section} className={styles.homeBtn} onClick={() => openSection(section)}>
              <span className="material-icons">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (screen.type === 'list') {
    const { section } = screen
    return (
      <div className={styles.view}>
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={back}>
            <span className="material-icons">arrow_back_ios</span>
          </button>
          <p className={styles.heading}>{titleMap[section]}</p>
        </div>
        <div className={styles.list}>
          {loading ? (
            <div className={styles.loadingRow}><span className="material-icons">hourglass_empty</span></div>
          ) : section === 'playlists' ? playlists.map(p => (
            <button key={p.id} className={styles.row} onClick={() => openTracks(p.id, 'playlist', p.name)}>
              <Thumb url={p.image} fallbackIcon="queue_music" />
              <div className={styles.info}>
                <p className={styles.name}>{p.name}</p>
                <p className={styles.sub}>{p.trackCount} tracks</p>
              </div>
              <span className={`material-icons ${styles.chevron}`}>chevron_right</span>
            </button>
          )) : section === 'albums' ? albums.map(a => (
            <button key={a.id} className={styles.row} onClick={() => openTracks(a.id, 'album', a.name)}>
              <Thumb url={a.image} fallbackIcon="album" />
              <div className={styles.info}>
                <p className={styles.name}>{a.name}</p>
                <p className={styles.sub}>{a.artist}</p>
              </div>
              <span className={`material-icons ${styles.chevron}`}>chevron_right</span>
            </button>
          )) : section === 'artists' ? artistList.map(a => (
            <button key={a.id} className={styles.row} onClick={() => openTracks(a.id, 'artist', a.name)}>
              <Thumb url={a.image} fallbackIcon="person" circle />
              <div className={styles.info}>
                <p className={styles.name}>{a.name}</p>
              </div>
              <span className={`material-icons ${styles.chevron}`}>chevron_right</span>
            </button>
          )) : section === 'liked'   ? liked.map(t => <TrackRow key={t.id} t={t} />)
            : section === 'recent'   ? recentTracks.map(t => <TrackRow key={t.id} t={t} />)
            : topTracks.map(t => <TrackRow key={t.id} t={t} />)
          }
        </div>
      </div>
    )
  }

  if (screen.type === 'tracks') {
    const contextUri = screen.kind === 'playlist' ? `spotify:playlist:${screen.id}`
                     : screen.kind === 'album'    ? `spotify:album:${screen.id}`
                     : `spotify:artist:${screen.id}`
    return (
      <div className={styles.view}>
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={back}>
            <span className="material-icons">arrow_back_ios</span>
          </button>
          <p className={`${styles.heading} ${styles.headingTrunc}`}>{screen.title}</p>
          <button className={styles.playAllBtn} onClick={() => send('play', { contextUri })}>
            <span className="material-icons">play_arrow</span>
          </button>
        </div>
        <div className={styles.list}>
          {loading
            ? <div className={styles.loadingRow}><span className="material-icons">hourglass_empty</span></div>
            : tracks.map(t => <TrackRow key={t.id} t={t} />)
          }
        </div>
      </div>
    )
  }

  return null
}

export default LibraryView

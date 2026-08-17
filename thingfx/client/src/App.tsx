import { useContext, useEffect, useRef, useState } from 'react'

import { AppBlurContext } from '@/contexts/AppBlurContext.tsx'
import { SocketContext } from '@/contexts/SocketContext.tsx'
import { MediaContext } from '@/contexts/MediaContext.tsx'
import { SleepContext } from '@/contexts/SleepContext.tsx'

import Background, { BgStyle } from '@/components/Background/Background.tsx'
import TopBar from '@/components/TopBar/TopBar.tsx'
import NowPlaying from '@/components/NowPlaying/NowPlaying.tsx'
import LibraryView from '@/components/LibraryView/LibraryView.tsx'
import PowerView from '@/components/PowerView/PowerView.tsx'
import ShortcutsView from '@/components/ShortcutsView/ShortcutsView.tsx'
import LoadingScreen from '@/components/LoadingScreen/LoadingScreen.tsx'
import Menu from '@/components/Menu/Menu.tsx'
import ButtonToast from '@/components/ButtonToast/ButtonToast.tsx'
import ConfirmDialog from '@/components/ConfirmDialog/ConfirmDialog.tsx'

import { extractAccentColor } from '@/lib/colorExtract.ts'

import styles from './App.module.css'

export type Tab = 'nowplaying' | 'shortcuts' | 'library' | 'settings'

export type Orientation = 'landscape' | 'portrait-right' | 'portrait-left'

export type ClientTheme = 'dark' | 'light' | 'glassy' | 'aero'

export function normalizeTheme(value: unknown): ClientTheme {
  return value === 'light' || value === 'glassy' || value === 'aero' ? value : 'dark'
}

export function normalizeOrientation(value: unknown): Orientation {
  return value === 'portrait-right' || value === 'portrait-left' ? value : 'landscape'
}

type ButtonShortcuts = Record<'1' | '2' | '3' | '4', string | null>
interface ShortcutInfo { id: string; name?: string }

const App: React.FC = () => {
  const { blurred } = useContext(AppBlurContext)
  const { ready, socket } = useContext(SocketContext)
  const { image, playerData, actions } = useContext(MediaContext)
  const { sleepState, setSleepState } = useContext(SleepContext)

  const [activeTab, setActiveTab] = useState<Tab>('nowplaying')
  const activeTabRef = useRef<Tab>('nowplaying')
  const navigate = (tab: Tab) => { activeTabRef.current = tab; setActiveTab(tab) }

  const [sleepTimer, setSleepTimer] = useState('300')
  const [autoReturn, setAutoReturn] = useState(true)
  const [defaultView, setDefaultView] = useState<Tab>('nowplaying')
  const defaultViewApplied = useRef(false)

  const [buttonShortcuts, setButtonShortcuts] = useState<ButtonShortcuts>({ '1': null, '2': null, '3': null, '4': null })
  const [serverTime, setServerTime] = useState<{ time: string; date: string } | null>(null)
  const [bgStyle, setBgStyle] = useState<BgStyle>('full')
  const [volumeSource, setVolumeSource] = useState<'player' | 'system'>('player')
  const [sysVolume, setSysVolume] = useState<number | null>(null)
  const [accentOverride, setAccentOverride] = useState<string | null>(null)
  const [backPrimary, setBackPrimary] = useState<'shortcuts' | 'library'>('shortcuts')
  const backPrimaryRef = useRef<'shortcuts' | 'library'>('shortcuts')
  backPrimaryRef.current = backPrimary
  const [visualizerOn, setVisualizerOn] = useState(true)
  const [wheelMode, setWheelMode] = useState<'volume' | 'scrub' | 'volume-native'>('volume')
  const holdToLockRef = useRef(false)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const holdFiredRef = useRef(false)
  const [visualizerSize, setVisualizerSize] = useState<'normal' | 'large' | 'xl'>(() => {
    const v = new URLSearchParams(window.location.search).get('vsize')
    return v === 'large' || v === 'xl' ? v : 'normal'
  })
  const [clientTheme, setClientTheme] = useState<ClientTheme>(() => {
    // Dev/preview override via ?theme=; real value comes from the server
    return normalizeTheme(new URLSearchParams(window.location.search).get('theme'))
  })
  const [orientation, setOrientation] = useState<Orientation>(() => {
    // Dev/preview override via ?orientation=; real value comes from the server
    if (!import.meta.env.DEV && !window.location.search.includes('orientation')) return 'landscape'
    return normalizeOrientation(new URLSearchParams(window.location.search).get('orientation'))
  })
  const accentOverrideRef = useRef<string | null>(null)
  accentOverrideRef.current = accentOverride
  const [weather, setWeather] = useState<{ temp: number; unit: 'F' | 'C'; icon: string; condition: string; city: string } | null>(null)
  const buttonShortcutsRef = useRef(buttonShortcuts)
  buttonShortcutsRef.current = buttonShortcuts

  // Shortcut name + icon lookup
  const [shortcutMap, setShortcutMap] = useState<Record<string, ShortcutInfo>>({})
  const [shortcutIcons, setShortcutIcons] = useState<Record<string, string>>({})
  const shortcutMapRef = useRef(shortcutMap)
  const shortcutIconsRef = useRef(shortcutIcons)
  shortcutMapRef.current = shortcutMap
  shortcutIconsRef.current = shortcutIcons

  // Toast state
  const [toast, setToast] = useState<{ btn: string; name: string; icon: string | null } | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Shutdown confirmation (used by preset buttons and the launcher tile)
  const [shutdownConfirm, setShutdownConfirm] = useState(false)

  const actionsRef = useRef(actions)
  const socketRef = useRef(socket)
  const playerDataRef = useRef(playerData)
  playerDataRef.current = playerData
  const wheelVolumeRef = useRef(playerData?.volume ?? 0)
  const lastWheelVolumeChange = useRef(0)
  const blurredRef = useRef(blurred)
  blurredRef.current = blurred
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastImageRef = useRef<string | null>(null)
  const lastEscapeRef = useRef<number>(0)

  actionsRef.current = actions
  socketRef.current = socket

  // Listen for apps list, buttons assignments, and app icons
  useEffect(() => {
    if (!socket) return
    const listener = (e: MessageEvent) => {
      const { type, action, data } = JSON.parse(e.data)
      if (type === 'time') {
        setServerTime(data)
      } else if (type === 'bgstyle') {
        setBgStyle(data as BgStyle)
      } else if (type === 'accent') {
        setAccentOverride((data as string | null) || null)
      } else if (type === 'orientation') {
        setOrientation(normalizeOrientation(data))
      } else if (type === 'theme') {
        setClientTheme(normalizeTheme(data))
      } else if (type === 'wheelmode') {
        setWheelMode(data === 'scrub' || data === 'volume-native' ? data : 'volume')
      } else if (type === 'sleeptimer') {
        setSleepTimer(typeof data === 'string' ? data : '300')
      } else if (type === 'autoreturn') {
        setAutoReturn(data !== false)
      } else if (type === 'defaultview') {
        const view: Tab = data === 'shortcuts' ? 'shortcuts' : 'nowplaying'
        setDefaultView(view)
        // Apply as the boot screen once, unless the user already navigated
        if (!defaultViewApplied.current) {
          defaultViewApplied.current = true
          if (
            activeTabRef.current === 'nowplaying' ||
            activeTabRef.current === 'shortcuts'
          )
            navigate(view)
        }
      } else if (type === 'holdtolock') {
        holdToLockRef.current = data === true
        if (!holdToLockRef.current && holdTimerRef.current) {
          clearTimeout(holdTimerRef.current)
          holdTimerRef.current = null
          holdFiredRef.current = false
        }
      } else if (type === 'visualizer') {
        setVisualizerOn(data !== false)
      } else if (type === 'visualizersize') {
        setVisualizerSize(data === 'large' || data === 'xl' ? data : 'normal')
      } else if (type === 'backbutton') {
        setBackPrimary(data === 'library' ? 'library' : 'shortcuts')
      } else if (type === 'volumesource') {
        setVolumeSource(data === 'system' ? 'system' : 'player')
      } else if (type === 'sysvolume') {
        if (typeof data === 'number') setSysVolume(data)
      } else if (type === 'screensaverstyle') {
        try { localStorage.setItem('lumi_screensaver_type', data as string) } catch {}
      } else if (type === 'weather') {
        setWeather(data)
      } else if (type === 'buttons') {
        setButtonShortcuts(data)
      } else if (type === 'apps' && !action) {
        const map: Record<string, ShortcutInfo> = {}
        for (const s of data as ShortcutInfo[]) map[s.id] = s
        setShortcutMap(map)
      } else if (type === 'apps' && action === 'image') {
        setShortcutIcons(prev => ({ ...prev, [data.id]: data.image }))
      }
    }
    socket.addEventListener('message', listener)
    socket.send(JSON.stringify({ type: 'time' }))
    socket.send(JSON.stringify({ type: 'bgstyle' }))
    socket.send(JSON.stringify({ type: 'accent' }))
    socket.send(JSON.stringify({ type: 'orientation' }))
    socket.send(JSON.stringify({ type: 'theme' }))
    socket.send(JSON.stringify({ type: 'visualizer' }))
    socket.send(JSON.stringify({ type: 'wheelmode' }))
    socket.send(JSON.stringify({ type: 'holdtolock' }))
    socket.send(JSON.stringify({ type: 'sleeptimer' }))
    socket.send(JSON.stringify({ type: 'autoreturn' }))
    socket.send(JSON.stringify({ type: 'defaultview' }))
    socket.send(JSON.stringify({ type: 'visualizersize' }))
    socket.send(JSON.stringify({ type: 'backbutton' }))
    socket.send(JSON.stringify({ type: 'screensaverstyle' }))
    socket.send(JSON.stringify({ type: 'volumesource' }))
    socket.send(JSON.stringify({ type: 'weather' }))
    // Load apps + preset button mappings up front so the physical buttons
    // work before the launcher is ever opened
    socket.send(JSON.stringify({ type: 'apps' }))
    return () => socket.removeEventListener('message', listener)
  }, [socket])

  // Keep the system volume readout fresh while it's the selected source
  useEffect(() => {
    if (volumeSource !== 'system' || !ready || !socket) return
    const request = () => {
      if (socket.readyState === 1)
        socket.send(JSON.stringify({ type: 'sysvolume', data: 'get' }))
    }
    request()
    const id = setInterval(request, 5000)
    return () => clearInterval(id)
  }, [volumeSource, ready, socket])

  // Accent color: fixed override from desktop settings, or dynamic from album art
  useEffect(() => {
    const apply = (color: string) => {
      document.documentElement.style.setProperty('--accent', color)
      const hex = color.match(/^#?([0-9a-f]{6})$/i)
      if (hex) {
        const n = parseInt(hex[1], 16)
        document.documentElement.style.setProperty('--accent-rgb', `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`)
        return
      }
      const m = color.match(/\d+/g)
      if (m) document.documentElement.style.setProperty('--accent-rgb', `${m[0]}, ${m[1]}, ${m[2]}`)
    }

    if (accentOverride) {
      apply(accentOverride)
      return
    }

    if (!image) return
    lastImageRef.current = image
    extractAccentColor(image).then(color => {
      if (accentOverrideRef.current) return
      apply(color)
    })
  }, [image, accentOverride])

  // Reflect orientation on the document: data-rotate drives the body rotation,
  // data-orientation lets component CSS adapt its layout
  useEffect(() => {
    document.documentElement.dataset.rotate = orientation
    document.documentElement.dataset.orientation = orientation === 'landscape' ? 'landscape' : 'portrait'
  }, [orientation])

  useEffect(() => {
    document.documentElement.dataset.theme = clientTheme
  }, [clientTheme])

  useEffect(() => {
    document.documentElement.dataset.visualizerSize = visualizerSize
  }, [visualizerSize])

  // Wake from the screensaver as soon as music starts playing
  useEffect(() => {
    if (playerData?.isPlaying && sleepState !== 'off') {
      setSleepState('off')
      socketRef.current?.send(JSON.stringify({ type: 'wake' }))
    }
  }, [playerData?.isPlaying, sleepState, setSleepState])

  // Sleep timer — only while nothing is playing; user input resets it
  useEffect(() => {
    const secs = parseInt(sleepTimer, 10)
    const armed =
      secs > 0 && ready && !playerData?.isPlaying && sleepState === 'off'

    const clear = () => {
      if (sleepTimerRef.current) {
        clearTimeout(sleepTimerRef.current)
        sleepTimerRef.current = null
      }
    }

    clear()
    if (!armed) return

    const arm = () => {
      clear()
      sleepTimerRef.current = setTimeout(
        () => setSleepState('screensaver'),
        secs * 1000
      )
    }
    arm()

    const events = ['keydown', 'wheel', 'pointerdown'] as const
    events.forEach(e => document.addEventListener(e, arm))
    return () => {
      clear()
      events.forEach(e => document.removeEventListener(e, arm))
    }
  }, [sleepTimer, ready, playerData?.isPlaying, sleepState, setSleepState])

  // Keep the launcher wheel's volume in sync with the server unless the
  // user just changed it
  useEffect(() => {
    if (!playerData) return
    if (lastWheelVolumeChange.current < Date.now() - 1000)
      wheelVolumeRef.current = playerData.volume
  }, [playerData])

  // The dial keeps doing its configured job on the app launcher (e.g. when
  // it's the main screen). Now Playing has its own richer wheel handling,
  // Library scrolls natively, and the Menu overlay owns the wheel while
  // open (it blurs the app), so this only runs on the launcher tab.
  useEffect(() => {
    if (activeTab !== 'shortcuts') return

    const listener = (e: globalThis.WheelEvent) => {
      if (blurredRef.current) return
      const dir = e.deltaX < 0 ? -1 : e.deltaX > 0 ? 1 : 0
      if (!dir) return
      e.preventDefault()

      if (wheelMode === 'volume-native') {
        socketRef.current?.send(
          JSON.stringify({ type: 'sysvolume', data: dir < 0 ? 'down' : 'up' })
        )
        return
      }

      const pd = playerDataRef.current
      if (!pd) return

      if (wheelMode === 'scrub') {
        if (!pd.supportedActions.includes('seek')) return
        const { current, total } = pd.track.duration
        if (total <= 0) return
        actionsRef.current.seek(
          Math.max(0, Math.min(current + dir * 5000, total))
        )
        return
      }

      if (!pd.supportedActions.includes('volume')) return
      const next = Math.max(0, Math.min(wheelVolumeRef.current + dir * 10, 100))
      if (next === wheelVolumeRef.current) return
      wheelVolumeRef.current = next
      lastWheelVolumeChange.current = Date.now()
      actionsRef.current.setVolume(next)
    }

    document.addEventListener('wheel', listener, { passive: false })
    return () => document.removeEventListener('wheel', listener)
  }, [activeTab, wheelMode])

  // Auto-return to the main screen after 1 minute without input
  useEffect(() => {
    const returnable =
      autoReturn &&
      (activeTab === 'nowplaying' || activeTab === 'shortcuts') &&
      activeTab !== defaultView

    if (!returnable) return

    let timer: ReturnType<typeof setTimeout>
    const arm = () => {
      clearTimeout(timer)
      timer = setTimeout(() => navigate(defaultView), 60000)
    }
    arm()

    const events = ['keydown', 'wheel', 'pointerdown'] as const
    events.forEach(e => document.addEventListener(e, arm))
    return () => {
      clearTimeout(timer)
      events.forEach(e => document.removeEventListener(e, arm))
    }
  }, [autoReturn, activeTab, defaultView])

  // Dial / keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (e.repeat) break
          if (holdToLockRef.current) {
            // Defer play/pause to keyup; a 3s hold locks the PC instead
            holdFiredRef.current = false
            if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
            holdTimerRef.current = setTimeout(() => {
              holdFiredRef.current = true
              socketRef.current?.send(JSON.stringify({ type: 'lock' }))
            }, 3000)
          } else {
            actionsRef.current.playPause()
          }
          break
        case 'ArrowRight':
          e.preventDefault(); actionsRef.current.skipForward(); break
        case 'ArrowLeft':
          e.preventDefault(); actionsRef.current.skipBackward(); break
        case 'Escape': {
          e.preventDefault()
          const now = Date.now()
          const primary = backPrimaryRef.current
          const secondary = primary === 'shortcuts' ? 'library' : 'shortcuts'
          if (now - lastEscapeRef.current < 400) {
            lastEscapeRef.current = 0
            navigate(secondary)
          } else {
            lastEscapeRef.current = now
            if (activeTabRef.current === 'nowplaying') navigate(primary)
            else navigate('nowplaying')
          }
          break
        }
        case '1': case '2': case '3': case '4': {
          const id = buttonShortcutsRef.current[e.key as '1'|'2'|'3'|'4']
          if (!id) break
          if (id === '__lock__') {
            socketRef.current?.send(JSON.stringify({ type: 'lock' }))
            setToast({ btn: e.key, name: 'Lock PC', icon: null })
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
            toastTimerRef.current = setTimeout(() => setToast(null), 1800)
            break
          }
          if (id === '__shutdown__') {
            // Wake first so the screensaver's key capture doesn't swallow
            // the dialog's Enter/Escape input
            setSleepState('off')
            socketRef.current?.send(JSON.stringify({ type: 'wake' }))
            setShutdownConfirm(true)
            break
          }
          socketRef.current?.send(JSON.stringify({ type: 'apps', action: 'open', data: id }))
          const info = shortcutMapRef.current[id]
          const name = info?.name ?? info?.id ?? id
          const icon = shortcutIconsRef.current[id] ?? null
          setToast({ btn: e.key, name, icon })
          if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
          toastTimerRef.current = setTimeout(() => setToast(null), 1800)
          break
        }
      }
    }

    const cancelHold = () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current)
        holdTimerRef.current = null
      }
      holdFiredRef.current = false
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      const wasHolding = holdTimerRef.current !== null
      const fired = holdFiredRef.current
      cancelHold()
      if (!wasHolding && !fired) return
      e.preventDefault()
      if (!fired) actionsRef.current.playPause()
    }

    // If the app loses focus or is hidden mid-hold, never fire the lock —
    // the keyup may have been missed.
    const handleVisibility = () => {
      if (document.hidden) cancelHold()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', cancelHold)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', cancelHold)
      document.removeEventListener('visibilitychange', handleVisibility)
      cancelHold()
    }
  }, [])

  return (
    <>
      <div className={styles.app} data-blurred={blurred || !ready}>
        <Background image={image} useStatic={activeTab !== 'nowplaying'} bgStyle={bgStyle} />
        {activeTab !== 'library' && (
          <TopBar
            clockFormat="12h"
            serverTime={serverTime}
            mediaPlayerActive={activeTab === 'nowplaying'}
            weather={weather}
            hideVolume={bgStyle === 'thumbnail-lg' && activeTab === 'nowplaying'}
            sysVolume={volumeSource === 'system' ? sysVolume : null}
          />
        )}

        <main className={styles.content}>
          {activeTab === 'nowplaying' && <NowPlaying showVisualizer={visualizerOn} bgStyle={bgStyle} wheelMode={wheelMode} />}
          {activeTab === 'shortcuts'  && <ShortcutsView onShutdownRequest={() => setShutdownConfirm(true)} />}
          {activeTab === 'library'    && <LibraryView />}
          {activeTab === 'settings'   && <PowerView />}
        </main>
      </div>

      <ConfirmDialog
        open={shutdownConfirm}
        title="Shut down your PC?"
        message="Your computer will shut down immediately."
        confirmLabel="Shut Down"
        onConfirm={() => {
          setShutdownConfirm(false)
          socketRef.current?.send(JSON.stringify({ type: 'shutdown' }))
        }}
        onCancel={() => setShutdownConfirm(false)}
      />
      <ButtonToast
        buttonNum={toast?.btn ?? null}
        name={toast?.name ?? null}
        icon={toast?.icon ?? null}
      />
      <LoadingScreen />
      <Menu onNavigate={navigate} />
    </>
  )
}

export default App

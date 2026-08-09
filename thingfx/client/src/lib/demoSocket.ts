// Demo socket for screenshots/previews (activated with ?demo in the URL).
// Mimics the desktop WebSocket server with canned data — never used on a
// real Car Thing.

function albumArt(): string {
  const c = document.createElement('canvas')
  c.width = c.height = 600
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 600, 600)
  g.addColorStop(0, '#7c3aed')
  g.addColorStop(0.5, '#db2777')
  g.addColorStop(1, '#f59e0b')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 600, 600)
  ctx.fillStyle = 'rgba(255,255,255,0.14)'
  for (let i = 0; i < 5; i++) {
    ctx.beginPath()
    ctx.arc(150 + i * 90, 420 - i * 60, 130, 0, Math.PI * 2)
    ctx.fill()
  }
  return c.toDataURL('image/png').split(',')[1]
}

const playerData = {
  isPlaying: true,
  volume: 62,
  shuffle: false,
  repeat: 'off',
  track: {
    id: 'demo',
    name: 'Midnight Drive',
    artists: ['The Nightowls'],
    album: 'Neon Horizon',
    duration: { current: 83000, total: 214000 }
  },
  supportedActions: ['play', 'pause', 'next', 'previous', 'volume', 'seek', 'image']
}

const demoApps = [
  { id: 'demo-1', name: 'Spotify' },
  { id: 'demo-2', name: 'Discord' },
  { id: 'demo-3', name: 'Steam' }
]

export class DemoSocket {
  readyState = WebSocket.OPEN
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  private listeners = new Set<(e: MessageEvent) => void>()
  private art = albumArt()

  constructor() {
    setTimeout(() => this.onopen?.(), 10)
  }

  addEventListener(type: string, fn: (e: MessageEvent) => void) {
    if (type === 'message') this.listeners.add(fn)
  }

  removeEventListener(_type: string, fn: (e: MessageEvent) => void) {
    this.listeners.delete(fn)
  }

  close() {}

  private emit(payload: unknown) {
    const e = { data: JSON.stringify(payload) } as MessageEvent
    setTimeout(() => this.listeners.forEach(fn => fn(e)), 10)
  }

  send(raw: string) {
    const { type, action } = JSON.parse(raw)
    const view = new URLSearchParams(window.location.search).get('view')
    switch (type) {
      case 'ping':
        this.emit({ type: 'pong' })
        break
      case 'playback':
        if (action === 'image')
          this.emit({ type: 'playback', action: 'image', data: this.art })
        else this.emit({ type: 'playback', data: playerData })
        break
      case 'apps':
        if (!action) {
          this.emit({ type: 'apps', data: demoApps })
          this.emit({ type: 'buttons', data: { '1': 'demo-1', '2': null, '3': null, '4': '__lock__' } })
        }
        break
      case 'lockshortcut':
        this.emit({ type: 'lockshortcut', data: true })
        break
      case 'bgstyle': {
        const bg = new URLSearchParams(window.location.search).get('bg')
        if (bg) this.emit({ type: 'bgstyle', data: bg })
        break
      }
      case 'defaultview':
        this.emit({
          type: 'defaultview',
          data: view === 'shortcuts' ? 'shortcuts' : 'nowplaying'
        })
        break
    }
  }
}

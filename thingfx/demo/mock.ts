// Browser mock of the Electron preload API — screenshot/demo use only.

const storage: Record<string, unknown> = {
  setupComplete: true,
  clientTheme: 'dark',
  bgStyle: 'thumbnail',
  orientation: 'landscape',
  visualizerSize: 'normal',
  wheelMode: 'volume',
  sleepTimer: '300',
  launcherAutoReturn: true,
  defaultView: 'nowplaying',
  showLockShortcut: false,
  holdToLock: false,
  playbackHandler: 'native',
  devMode: false
}

const shortcuts = [
  { id: 'demo-1', name: 'Spotify', command: '"C:\\Users\\you\\AppData\\Roaming\\Spotify\\Spotify.exe"' },
  { id: 'demo-2', name: 'Discord', command: '"C:\\Users\\you\\AppData\\Local\\Discord\\Update.exe"' },
  { id: 'demo-3', name: 'Steam', command: '"C:\\Program Files (x86)\\Steam\\steam.exe"' }
]

const handlers: Record<string, (...args: unknown[]) => unknown> = {
  getStorageValue: k => Promise.resolve(storage[k as string] ?? null),
  setStorageValue: (k, v) => {
    storage[k as string] = v
    return Promise.resolve()
  },
  on: (channel, cb) => {
    if (channel === 'carThingState')
      setTimeout(() => (cb as (s: string) => void)('ready'), 50)
    return () => {}
  },
  getVersion: () => Promise.resolve('1.0.0-b3'),
  getChannel: () => Promise.resolve('stable'),
  isDevMode: () => Promise.resolve(false),
  getClientUpdatePending: () => Promise.resolve(false),
  getShortcuts: () => Promise.resolve(shortcuts),
  getButtonShortcuts: () =>
    Promise.resolve({ '1': 'demo-1', '2': null, '3': null, '4': '__lock__' }),
  findCarThing: () => Promise.resolve(true),
  findSetupCarThing: () => Promise.resolve('ready'),
  hasCustomClient: () => Promise.resolve(false),
  checkUpdate: () => Promise.resolve(false),
  getLogs: () => Promise.resolve([]),
  getServerInfo: () => Promise.resolve(null),
  validateConfig: () => Promise.resolve(true),
  triggerCarThingStateUpdate: () => Promise.resolve()
}

;(window as unknown as { api: unknown }).api = new Proxy(
  {},
  {
    get: (_t, prop: string) =>
      handlers[prop] ?? (() => Promise.resolve(undefined))
  }
)

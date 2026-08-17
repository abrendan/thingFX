import '@electron-toolkit/preload'

interface Shortcut {
  id: string
  command: string
}

interface DeviceInfo {
  serial: string
  name: string
  state: 'not_installed' | 'installing' | 'ready' | 'disconnected'
  firstSeen?: number
  lastSeen?: number
  overrides: Record<string, string | undefined>
}

declare global {
  interface Window {
    api: {
      on: (
        channel: string,
        listener: (...args: unknown[]) => void
      ) => () => void
      findCarThing: () => Promise<string | boolean>
      findSetupCarThing: () => Promise<
        'not_found' | 'not_installed' | 'ready'
      >
      rebootCarThing: (serial?: string) => Promise<void>
      getDevices: () => Promise<DeviceInfo[]>
      setDeviceProfile: (
        serial: string,
        patch: {
          name?: string
          overrides?: Record<string, string | undefined>
        }
      ) => Promise<DeviceInfo[]>
      forgetDevice: (serial: string) => Promise<DeviceInfo[]>
      restoreCarThing: () => Promise<void>
      installApp: () => Promise<string | true>
      startServer: () => Promise<void>
      stopServer: () => Promise<void>
      getServerInfo: () => Promise<{
        running: boolean
        port: number | null
      }>
      forwardSocketServer: () => Promise<void>
      getVersion: () => Promise<string>
      getClientUpdatePending: () => Promise<boolean>
      getStorageValue: (key: string) => Promise<unknown>
      setStorageValue: (key: string, value: unknown) => Promise
      triggerCarThingStateUpdate: () => void
      restartAdbServer: () => Promise<{ ok: boolean; error?: string }>
      uploadShortcutImage: (name: string) => Promise<string>
      removeNewShortcutImage: () => Promise<void>
      browseForApp: () => Promise<string | null>
      listStoreApps: () => Promise<{ name: string; appId: string }[]>
      getShortcuts: () => Promise<Shortcut[]>
      getButtonShortcuts: () => Promise<Record<string, string | null>>
      setButtonShortcuts: (
        buttons: Record<string, string | null>
      ) => Promise<void>
      downloadUpdate: () => Promise<void>
      quitAndInstall: () => Promise<void>
      addShortcut: (shortcut: Shortcut) => Promise<void>
      removeShortcut: (id: string) => Promise<void>
      updateShortcut: (shortcut: Shortcut) => Promise<void>
      isDevMode: () => Promise<boolean>
      getBrightness: () => Promise<number>
      setBrightness: (brightness: number) => Promise<void>
      getPatches: () => Promise<
        { name: string; description: string; installed: boolean }[] | false
      >
      applyPatch: (patchName: string) => Promise<void>
      validateConfig: (
        handlerName: string,
        config: unknown
      ) => Promise<boolean>
      getPlaybackHandlerConfig: (handlerName: string) => Promise<unknown>
      setPlaybackHandlerConfig: (
        handlerName: string,
        config: unknown
      ) => Promise<void>
      restartPlaybackHandler: () => Promise<void>
      hasCustomClient: () => Promise<boolean>
      importCustomClient: () => Promise<void>
      removeCustomClient: () => Promise<void>
      getLogs: () => Promise<string[]>
      clearLogs: () => Promise<void>
      downloadLogs: () => Promise<void>
      uploadScreensaverImage: () => Promise<{
        success: boolean
        error?: string
        message?: string
      }>
      removeScreensaverImage: () => Promise<boolean>
      chooseScreensaverFolder: () => Promise<{
        success: boolean
        folder?: string
        count?: number
        error?: string
        message?: string
      }>
      removeScreensaverFolder: () => Promise<boolean>
      getScreensaverFolder: () => Promise<string | null>
      hasCustomScreensaverImage: () => Promise<boolean>
      openDevTools: () => void
      getChannel: () => Promise<'stable' | 'nightly'>
      checkUpdate: () => Promise<{
        currentVersion: string
        latestVersion: string
        downloadUrl: string
      } | null>
      findOpenPort: () => Promise<number>
      isPortOpen: (port: number) => Promise<boolean>
      saveShortcutIconFromDataUrl: (
        id: string,
        dataUrl: string
      ) => Promise<void>
      refreshWeather: () => Promise<{ success: boolean; message: string }>
    }
  }
}

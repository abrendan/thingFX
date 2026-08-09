import { playbackManager } from '../playback/playback.js'
import { checkInternet, log } from '../utils.js'
import { getStorageValue } from '../storage.js'
import { serverManager } from '../server.js'

import { AuthenticatedWebSocket } from '../../types/WebSocketServer.js'
import { SetupFunction } from '../../types/WebSocketSetup.js'

export const name = 'playback'

let retryTimeout: NodeJS.Timeout | null = null

function broadcast(data: unknown) {
  const wss = serverManager.getServer()
  if (!wss) return
  wss.clients.forEach((ws: AuthenticatedWebSocket) => {
    if (!ws.authenticated || ws.readyState !== 1) return
    ws.send(JSON.stringify({ type: 'playback', data }))
  })
}

export const setup: SetupFunction = async () => {
  playbackManager.on('playback', data => broadcast(data))

  const pollInterval = setInterval(async () => {
    const data = await playbackManager.getPlayback()
    if (!data) return
    broadcast(data)
  }, 3000)

  playbackManager.on('close', async () => {
    await playbackManager.cleanup()
    if (retryTimeout) return

    if (
      playbackManager.requiresInternet(getStorageValue('playbackHandler'))
    ) {
      const hasInternet = await checkInternet()
      if (retryTimeout) return
      if (!hasInternet) {
        log(
          'Closed, will retry when connection is restored...',
          'PlaybackManager'
        )

        retryTimeout = setInterval(async () => {
          const hasInternet = await checkInternet()
          if (hasInternet) {
            if (retryTimeout) {
              clearInterval(retryTimeout)
              retryTimeout = null
            }
            await playbackManager.setup(getStorageValue('playbackHandler'))
          }
        }, 5000)
      }
    } else {
      log(
        'Closed, attempting to reopen in 5 seconds...',
        'PlaybackManager'
      )

      retryTimeout = setTimeout(async () => {
        if (retryTimeout) {
          clearInterval(retryTimeout)
          retryTimeout = null
        }
        await playbackManager.setup(getStorageValue('playbackHandler'))
      }, 5000)
    }
  })

  playbackManager.on('open', (handlerName?: string) => {
    log(`Opened with handler ${handlerName}`, 'PlaybackManager')
  })

  playbackManager.on('error', err => {
    log(`An error occurred: ${err}`, 'PlaybackManager')
  })

  const playbackHandler = getStorageValue('playbackHandler')

  if (!playbackHandler || playbackHandler === 'none') {
    log('No handler set', 'Playback')
  } else {
    await playbackManager.setup(playbackHandler)
  }

  return async () => {
    clearInterval(pollInterval)
    if (retryTimeout) {
      clearInterval(retryTimeout)
      retryTimeout = null
    }
    await playbackManager.cleanup()
    playbackManager.removeAllListeners()
  }
}

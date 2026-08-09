import { RepeatMode } from '../../types/Playback.js'
import {
  HandlerAction,
  HandlerFunction
} from '../../types/WebSocketHandler.js'
import { playbackManager } from '../playback/playback.js'

export const name = 'playback'

export const hasActions = true

const refresh = (delay = 600) => setTimeout(() => playbackManager.refreshPlayback(), delay)

export const actions: HandlerAction[] = [
  {
    action: 'pause',
    handle: async () => {
      await playbackManager.pause()
      refresh()
    }
  },
  {
    action: 'play',
    handle: async () => {
      await playbackManager.play()
      refresh()
    }
  },
  {
    action: 'volume',
    handle: async (_ws, data) => {
      await playbackManager.setVolume((data as { volume: number }).volume)
      refresh()
    }
  },
  {
    action: 'seek',
    handle: async (_ws, data) => {
      await playbackManager.seek((data as { position: number }).position)
      refresh()
    }
  },
  {
    action: 'image',
    handle: async ws => {
      const image = await playbackManager.getImage()
      ws.send(
        JSON.stringify({
          type: 'playback',
          action: 'image',
          data: image ? image.toString('base64') : null
        })
      )
    }
  },
  {
    action: 'previous',
    handle: async () => {
      await playbackManager.previous()
      refresh(1000)
    }
  },
  {
    action: 'next',
    handle: async () => {
      await playbackManager.next()
      refresh(1000)
    }
  },
  {
    action: 'shuffle',
    handle: async (_, data) => {
      await playbackManager.shuffle((data as { state: boolean }).state)
      refresh()
    }
  },
  {
    action: 'repeat',
    handle: async (_, data) => {
      await playbackManager.repeat((data as { state: RepeatMode }).state)
      refresh()
    }
  }
]

export const handle: HandlerFunction = async ws => {
  const res = await playbackManager.getPlayback()
  ws.send(
    JSON.stringify({
      type: 'playback',
      data: res
    })
  )
}

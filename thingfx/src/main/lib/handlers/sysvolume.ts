import { exec } from 'child_process'

import { getSystemVolume, getSystemVolumeStepCommand } from '../utils.js'

import { HandlerFunction } from '../../types/WebSocketHandler.js'

export const name = 'sysvolume'

export const hasActions = false

async function sendVolume(ws: Parameters<HandlerFunction>[0]) {
  const volume = await getSystemVolume()
  if (volume === null) return
  ws.send(JSON.stringify({ type: 'sysvolume', data: volume }))
}

// Adjusts the host OS volume (used by the 'volume-native' wheel mode) or,
// with data === 'get', reports the current volume percentage back.
export const handle: HandlerFunction = async (ws, data) => {
  if (data === 'get') {
    await sendVolume(ws)
    return
  }

  const direction = data === 'up' ? 'up' : data === 'down' ? 'down' : null
  if (!direction) return

  const parsed = getSystemVolumeStepCommand(direction)
  if (!parsed) return
  const { cmd, shell } = parsed

  exec(cmd, { shell })

  // Report the new level shortly after the keypress has been processed
  setTimeout(() => sendVolume(ws), 300)
}

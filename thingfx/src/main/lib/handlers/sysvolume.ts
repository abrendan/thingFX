import { exec } from 'child_process'

import { getSystemVolumeStepCommand } from '../utils.js'

import { HandlerFunction } from '../../types/WebSocketHandler.js'

export const name = 'sysvolume'

export const hasActions = false

// Adjusts the host OS volume (used by the 'volume-native' wheel mode)
export const handle: HandlerFunction = async (_ws, data) => {
  const direction = data === 'up' ? 'up' : data === 'down' ? 'down' : null
  if (!direction) return

  const parsed = getSystemVolumeStepCommand(direction)
  if (!parsed) return
  const { cmd, shell } = parsed

  exec(cmd, { shell })
}

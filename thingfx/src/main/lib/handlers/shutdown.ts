import { exec } from 'child_process'

import { getShutdownPlatformCommand } from '../utils.js'

import { HandlerFunction } from '../../types/WebSocketHandler.js'

export const name = 'shutdown'

export const hasActions = false

export const handle: HandlerFunction = async () => {
  const parsed = getShutdownPlatformCommand()
  if (!parsed) return
  const { cmd, shell } = parsed

  exec(cmd, {
    shell
  })
}

import { setAutoBrightness } from '../adb.js'

import { HandlerFunction } from '../../types/WebSocketHandler.js'
import { getStorageValue } from '../storage.js'
import { isPcLocked } from '../lockstate.js'

export const name = 'wake'

export const hasActions = false

export const handle: HandlerFunction = async () => {
  // Ignore client-originated wakes while the PC session is locked
  if (isPcLocked()) return
  if (getStorageValue('autoBrightness') === true) {
    await setAutoBrightness(null, true)
  }
}

// Tracks whether the host PC session is locked so lock/unlock transitions
// can be applied in a latest-wins fashion, and so clients that (re)connect
// while the PC is locked are put straight into the screensaver.
let pcLocked = false
let generation = 0

export function isPcLocked(): boolean {
  return pcLocked
}

/**
 * Records the new lock state and returns a generation token. Callers doing
 * slow async work (ADB discovery, per-device brightness) must check the
 * token with `isCurrentLockGeneration` before every mutation so a newer
 * lock/unlock transition always wins.
 */
export function setPcLocked(locked: boolean): number {
  pcLocked = locked
  return ++generation
}

export function isCurrentLockGeneration(token: number): boolean {
  return token === generation
}

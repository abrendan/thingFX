import WebSocket from 'ws'

interface AuthenticatedWebSocket extends WebSocket {
  authenticated?: boolean
  // ADB serial of the CarThing this socket belongs to (set via the
  // 'identify' message; undefined for clients that never identify)
  deviceSerial?: string
}

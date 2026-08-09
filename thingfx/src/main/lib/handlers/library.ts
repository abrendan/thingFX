import axios from 'axios'
import { HandlerAction, HandlerFunction } from '../../types/WebSocketHandler.js'
import spotify from '../playback/spotify.js'

export const name = 'library'
export const hasActions = true

function active() {
  return !!spotify.instance
}

function send(ws: Parameters<HandlerFunction>[0], action: string, data?: unknown) {
  ws.send(JSON.stringify({ type: 'library', action, data }))
}

export const actions: HandlerAction[] = [
  {
    action: 'playlists',
    handle: async ws => {
      if (!active()) return send(ws, 'playlists', [])
      try {
        const res = await spotify.instance!.get('/me/playlists', { params: { limit: 50 } })
        const items = (res.data.items ?? []).filter(Boolean).map((p: any) => ({
          id: p.id,
          name: p.name,
          image: p.images?.[0]?.url ?? null,
          trackCount: p.tracks?.total ?? 0
        }))
        send(ws, 'playlists', items)
      } catch {
        send(ws, 'playlists', [])
      }
    }
  },
  {
    action: 'albums',
    handle: async ws => {
      if (!active()) return send(ws, 'albums', [])
      try {
        const res = await spotify.instance!.get('/me/albums', { params: { limit: 50 } })
        const items = (res.data.items ?? [])
          .filter((item: any) => item?.album)
          .map(({ album: a }: any) => ({
            id: a.id,
            name: a.name,
            artist: a.artists?.[0]?.name ?? '',
            image: a.images?.[1]?.url ?? a.images?.[0]?.url ?? null
          }))
        send(ws, 'albums', items)
      } catch {
        send(ws, 'albums', [])
      }
    }
  },
  {
    action: 'liked',
    handle: async ws => {
      if (!active()) return send(ws, 'liked', [])
      try {
        const res = await spotify.instance!.get('/me/tracks', { params: { limit: 50 } })
        const items = (res.data.items ?? [])
          .filter((item: any) => item?.track)
          .map(({ track: t }: any) => ({
            id: t.id,
            name: t.name,
            artist: t.artists?.[0]?.name ?? '',
            uri: t.uri
          }))
        send(ws, 'liked', items)
      } catch {
        send(ws, 'liked', [])
      }
    }
  },
  {
    action: 'recent',
    handle: async ws => {
      if (!active()) return send(ws, 'recent', [])
      try {
        const res = await spotify.instance!.get('/me/player/recently-played', { params: { limit: 50 } })
        const seen = new Set<string>()
        const items = (res.data.items ?? [])
          .filter((item: any) => item?.track?.id && !seen.has(item.track.id) && seen.add(item.track.id))
          .map(({ track: t }: any) => ({
            id: t.id,
            name: t.name,
            artist: t.artists?.[0]?.name ?? '',
            uri: t.uri
          }))
        send(ws, 'recent', items)
      } catch {
        send(ws, 'recent', [])
      }
    }
  },
  {
    action: 'top',
    handle: async ws => {
      if (!active()) return send(ws, 'top', [])
      try {
        const res = await spotify.instance!.get('/me/top/tracks', { params: { limit: 50, time_range: 'medium_term' } })
        const items = (res.data.items ?? []).filter(Boolean).map((t: any) => ({
          id: t.id,
          name: t.name,
          artist: t.artists?.[0]?.name ?? '',
          uri: t.uri
        }))
        send(ws, 'top', items)
      } catch {
        send(ws, 'top', [])
      }
    }
  },
  {
    action: 'artists',
    handle: async ws => {
      if (!active()) return send(ws, 'artists', [])
      try {
        const res = await spotify.instance!.get('/me/following', { params: { type: 'artist', limit: 50 } })
        const items = (res.data.artists?.items ?? []).filter(Boolean).map((a: any) => ({
          id: a.id,
          name: a.name,
          image: a.images?.[1]?.url ?? a.images?.[0]?.url ?? null
        }))
        send(ws, 'artists', items)
      } catch {
        send(ws, 'artists', [])
      }
    }
  },
  {
    action: 'tracks',
    handle: async (ws, data) => {
      const { id, type } = data as { id: string; type: 'playlist' | 'album' | 'artist' }
      if (!active()) return send(ws, 'tracks', [])
      try {
        if (type === 'artist') {
          const profileRes = await spotify.instance!.get('/me')
          const market = profileRes.data.country ?? 'US'
          const res = await spotify.instance!.get(`/artists/${id}/top-tracks`, { params: { market } })
          const items = (res.data.tracks ?? []).filter(Boolean).map((t: any) => ({
            id: t.id,
            name: t.name,
            artist: t.artists?.[0]?.name ?? '',
            uri: t.uri
          }))
          return send(ws, 'tracks', items)
        }
        const url = type === 'playlist' ? `/playlists/${id}/tracks` : `/albums/${id}/tracks`
        const res = await spotify.instance!.get(url, { params: { limit: 50 } })
        const items = (res.data.items ?? [])
          .map((item: any) => {
            const t = type === 'playlist' ? item?.track : item
            if (!t?.id) return null
            return { id: t.id, name: t.name, artist: t.artists?.[0]?.name ?? '', uri: t.uri }
          })
          .filter(Boolean)
        send(ws, 'tracks', items)
      } catch {
        send(ws, 'tracks', [])
      }
    }
  },
  {
    action: 'check-liked',
    handle: async (ws, data) => {
      if (!active()) return send(ws, 'liked-status', { ids: [], status: [] })
      try {
        const { ids } = data as { ids: string[] }
        if (!ids?.length) return send(ws, 'liked-status', { ids: [], status: [] })
        const res = await spotify.instance!.get('/me/tracks/contains', {
          params: { ids: ids.slice(0, 50).join(',') }
        })
        send(ws, 'liked-status', { ids, status: res.data ?? [] })
      } catch {
        send(ws, 'liked-status', { ids: [], status: [] })
      }
    }
  },
  {
    action: 'image',
    handle: async (ws, data) => {
      const { url } = data as { url: string }
      if (!url) return
      try {
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 8000 })
        if (res.status !== 200) return send(ws, 'image', { url, base64: null })
        const contentType = (res.headers['content-type'] as string) ?? 'image/jpeg'
        const base64 = `data:${contentType};base64,${Buffer.from(res.data).toString('base64')}`
        send(ws, 'image', { url, base64 })
      } catch {
        send(ws, 'image', { url, base64: null })
      }
    }
  },
  {
    action: 'play',
    handle: async (_ws, data) => {
      const { uri, contextUri } = data as { uri?: string; contextUri?: string }
      if (!active()) return
      try {
        let body: object
        if (contextUri && uri) body = { context_uri: contextUri, offset: { uri } }
        else if (contextUri)   body = { context_uri: contextUri }
        else if (uri)          body = { uris: [uri] }
        else return
        await spotify.instance!.put('/me/player/play', body)
      } catch {}
    }
  },
  {
    action: 'queue',
    handle: async (ws, data) => {
      const { uri } = data as { uri: string }
      if (!active()) return
      await spotify.instance!.post('/me/player/queue', null, { params: { uri } })
      send(ws, 'queued')
    }
  },
  {
    action: 'like',
    handle: async (ws, data) => {
      const { id, state } = data as { id: string; state: boolean }
      if (!active()) return
      if (state) {
        await spotify.instance!.put('/me/tracks', null, { params: { ids: id } })
      } else {
        await spotify.instance!.delete('/me/tracks', { params: { ids: id } })
      }
      send(ws, 'like_result', { id, state })
    }
  }
]

export const handle: HandlerFunction = async ws => {
  send(ws, 'playlists', [])
}

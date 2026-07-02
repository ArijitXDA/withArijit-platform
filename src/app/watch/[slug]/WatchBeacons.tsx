'use client'
import { useEffect } from 'react'

// Emits play / 25-50-75-100% / ended beacons for the watch player.
// Self-hosted <video id="ost-player"> uses native events; a YouTube iframe
// id="ost-player" (with enablejsapi=1) uses the IFrame API. Carries the comms
// token (?s=) so watch events attribute to the send/contact. Renders nothing.
export default function WatchBeacons({ slug, token, youtube }: { slug: string; token?: string; youtube?: boolean }) {
  useEffect(() => {
    const sent = new Set<string>()
    const beacon = (event: string, position_pct?: number) => {
      if (sent.has(event)) return
      sent.add(event)
      const payload = JSON.stringify({ slug, token: token || undefined, event, position_pct })
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/track/video', new Blob([payload], { type: 'application/json' }))
        } else {
          fetch('/api/track/video', { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' }, keepalive: true })
        }
      } catch { /* ignore */ }
    }
    const progress = (pct: number) => {
      if (pct >= 100) beacon('p100', 100)
      else if (pct >= 75) beacon('p75', 75)
      else if (pct >= 50) beacon('p50', 50)
      else if (pct >= 25) beacon('p25', 25)
    }

    // ── Self-hosted <video> ──────────────────────────────────────────────
    if (!youtube) {
      const v = document.getElementById('ost-player') as HTMLVideoElement | null
      if (v && typeof v.play === 'function') {
        const onPlay = () => beacon('play')
        const onTime = () => { if (v.duration > 0) progress((v.currentTime / v.duration) * 100) }
        const onEnded = () => beacon('ended')
        v.addEventListener('play', onPlay)
        v.addEventListener('timeupdate', onTime)
        v.addEventListener('ended', onEnded)
        return () => {
          v.removeEventListener('play', onPlay)
          v.removeEventListener('timeupdate', onTime)
          v.removeEventListener('ended', onEnded)
        }
      }
      return
    }

    // ── YouTube iframe ───────────────────────────────────────────────────
    let player: any = null
    let poll: ReturnType<typeof setInterval> | null = null
    const init = () => {
      const YT = (window as any).YT
      if (!YT || !YT.Player) return
      player = new YT.Player('ost-player', {
        events: {
          onStateChange: (e: any) => {
            if (e.data === YT.PlayerState.PLAYING) {
              beacon('play')
              if (!poll) {
                poll = setInterval(() => {
                  try {
                    const d = player?.getDuration?.() || 0
                    const t = player?.getCurrentTime?.() || 0
                    if (d > 0) progress((t / d) * 100)
                  } catch { /* ignore */ }
                }, 4000)
              }
            }
            if (e.data === YT.PlayerState.ENDED) { beacon('p100', 100); beacon('ended') }
          },
        },
      })
    }
    if ((window as any).YT && (window as any).YT.Player) {
      init()
    } else {
      const prev = (window as any).onYouTubeIframeAPIReady
      ;(window as any).onYouTubeIframeAPIReady = () => { prev?.(); init() }
      if (!document.getElementById('yt-iframe-api')) {
        const s = document.createElement('script')
        s.id = 'yt-iframe-api'
        s.src = 'https://www.youtube.com/iframe_api'
        document.body.appendChild(s)
      }
    }
    return () => { if (poll) clearInterval(poll) }
  }, [slug, token, youtube])

  return null
}

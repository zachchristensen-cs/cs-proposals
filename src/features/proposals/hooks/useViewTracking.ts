import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const TRACK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proposal-track`
const PING_INTERVAL_MS = 15_000

/**
 * Tracks anonymous views of the public proposal page: open event, active
 * time on page, max scroll depth, and which sections were seen.
 * Logged-in team members are never tracked.
 */
export function useViewTracking(slug: string | undefined, ready: boolean) {
  useEffect(() => {
    if (!slug || !ready) return

    let cleanup: (() => void) | undefined
    let cancelled = false

    async function init() {
      // Don't track internal (logged-in) views
      const { data } = await supabase.auth.getSession()
      if (data.session || cancelled) return
      cleanup = startTracking(slug!)
    }

    init()

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [slug, ready])
}

function startTracking(slug: string): () => void {
  const sessionId = crypto.randomUUID()
  const token = new URLSearchParams(window.location.search).get('r')

  let activeSeconds = 0
  let maxScrollPct = 0
  let dirty = false
  const sectionsSeen = new Set<string>()

  send({
    type: 'open',
    slug,
    session_id: sessionId,
    token: token || undefined,
    referrer: document.referrer || undefined,
  })

  // Active time: count seconds only while the tab is visible
  const tick = window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      activeSeconds += 1
      dirty = true
    }
  }, 1000)

  // Scroll depth
  function onScroll() {
    const doc = document.documentElement
    const total = doc.scrollHeight - window.innerHeight
    const pct = total > 0 ? Math.round(((window.scrollY || doc.scrollTop) / total) * 100) : 100
    if (pct > maxScrollPct) {
      maxScrollPct = Math.min(100, pct)
      dirty = true
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()

  // Section visibility via IntersectionObserver
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const name = (entry.target as HTMLElement).dataset.trackSection
          if (name && !sectionsSeen.has(name)) {
            sectionsSeen.add(name)
            dirty = true
          }
        }
      }
    },
    { threshold: 0.3 },
  )

  // Sections render after content loads; label each <section> by its heading text
  const observeTimer = window.setTimeout(() => {
    const sections = document.querySelectorAll<HTMLElement>('#proposal-content section')
    sections.forEach((el, i) => {
      if (!el.dataset.trackSection) {
        const label =
          el.querySelector('h1, h2, h3, p')?.textContent?.trim().slice(0, 60) || `Section ${i + 1}`
        el.dataset.trackSection = label
      }
      observer.observe(el)
    })
  }, 500)

  function ping(useKeepalive = false) {
    if (!dirty) return
    dirty = false
    send(
      {
        type: 'ping',
        slug,
        session_id: sessionId,
        duration_seconds: activeSeconds,
        max_scroll_pct: maxScrollPct,
        sections_viewed: Array.from(sectionsSeen),
      },
      useKeepalive,
    )
  }

  const pinger = window.setInterval(() => ping(), PING_INTERVAL_MS)

  function onVisibilityChange() {
    if (document.visibilityState === 'hidden') ping(true)
  }
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('pagehide', onVisibilityChange)

  return () => {
    window.clearInterval(tick)
    window.clearInterval(pinger)
    window.clearTimeout(observeTimer)
    window.removeEventListener('scroll', onScroll)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('pagehide', onVisibilityChange)
    observer.disconnect()
  }
}

function send(payload: Record<string, unknown>, useKeepalive = false) {
  const body = JSON.stringify(payload)
  try {
    if (useKeepalive && 'sendBeacon' in navigator) {
      navigator.sendBeacon(TRACK_URL, new Blob([body], { type: 'text/plain' }))
      return
    }
    fetch(TRACK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body,
      keepalive: useKeepalive,
    }).catch(() => {})
  } catch {
    // Tracking must never break the page
  }
}

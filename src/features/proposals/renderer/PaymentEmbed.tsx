import { useEffect, useRef, useState } from 'react'

const PAY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proposal-pay`

interface PaymentEmbedProps {
  slug: string
}

type PayState =
  | { kind: 'loading' }
  | { kind: 'paid' }
  | { kind: 'ready' }
  | { kind: 'error'; message: string }

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Stripe?: (key: string, opts?: { stripeAccount?: string }) => any
  }
}

function loadStripeJs(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Stripe) return resolve()
    const script = document.createElement('script')
    script.src = 'https://js.stripe.com/v3'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Stripe'))
    document.head.appendChild(script)
  })
}

/**
 * Embedded Stripe Checkout mounted directly on the proposal page after
 * signing: card, ACH debit, and US bank transfer (wire) when enabled.
 */
export function PaymentEmbed({ slug }: PaymentEmbedProps) {
  const [state, setState] = useState<PayState>({ kind: 'loading' })
  const containerRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(false)

  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true
    let cancelled = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let checkout: any

    async function init() {
      try {
        const res = await fetch(PAY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ slug }),
        })
        const data = await res.json().catch(() => null)
        if (cancelled) return

        if (!res.ok) {
          setState({ kind: 'error', message: data?.error || 'Payment is unavailable right now.' })
          return
        }
        if (data.paid) {
          setState({ kind: 'paid' })
          return
        }
        if (!data.client_secret || !data.publishable_key) {
          setState({
            kind: 'error',
            message: 'Payment is not fully configured yet. We will email you an invoice instead.',
          })
          return
        }

        await loadStripeJs()
        if (cancelled || !window.Stripe) return

        const stripe = window.Stripe(
          data.publishable_key,
          data.stripe_account ? { stripeAccount: data.stripe_account } : undefined,
        )
        checkout = await stripe.initEmbeddedCheckout({ clientSecret: data.client_secret })
        if (cancelled) {
          checkout?.destroy?.()
          return
        }
        setState({ kind: 'ready' })
        // Mount after render tick so the container exists
        requestAnimationFrame(() => {
          if (containerRef.current) checkout.mount(containerRef.current)
        })
      } catch (err) {
        if (!cancelled) {
          setState({
            kind: 'error',
            message: err instanceof Error ? err.message : 'Payment is unavailable right now.',
          })
        }
      }
    }

    init()
    return () => {
      cancelled = true
      checkout?.destroy?.()
    }
  }, [slug])

  return (
    <div className="mt-10">
      <h2 className="mb-6 text-center font-serif text-4xl text-[var(--p-ink)]">Payment</h2>

      {state.kind === 'loading' && (
        <p className="text-center text-sm text-[var(--p-muted)]">Loading secure payment...</p>
      )}

      {state.kind === 'paid' && (
        <div className="rounded-md border border-[var(--p-border)] p-6 text-center">
          <p className="font-serif text-xl text-[var(--p-ink)]">Payment received. Thank you!</p>
        </div>
      )}

      {state.kind === 'error' && (
        <p className="text-center text-sm text-[var(--p-muted)]">{state.message}</p>
      )}

      <div ref={containerRef} className={state.kind === 'ready' ? '' : 'hidden'} />

      {state.kind === 'ready' && (
        <p className="mt-3 text-center text-xs text-[var(--p-muted)]">
          Prefer to pay by wire? Select Bank transfer above for wire instructions.
        </p>
      )}
    </div>
  )
}

import { useRef, useState } from 'react'
import { getBrand } from './brands'

const SIGN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proposal-sign`
const SCRIPT_FONT = "'Snell Roundhand', 'Segoe Script', 'Brush Script MT', cursive"

interface SignatureSectionProps {
  slug: string
  brand?: string
  signedAt: string | null
  /** itemKey()s of optional items the viewer turned off; sent with the signature */
  deselected?: Set<string>
  /** Adjusted total shown next to the sign button */
  total?: number
}

export function SignatureSection({ slug, brand, signedAt, deselected, total }: SignatureSectionProps) {
  const brandConfig = getBrand(brand)
  const [mode, setMode] = useState<'typed' | 'drawn'>('typed')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justSigned, setJustSigned] = useState<string | null>(null)
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const hasDrawn = useRef(false)

  const typedName = `${firstName} ${lastName}`.trim()
  const done = signedAt || justSigned

  function canvasPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    drawing.current = true
    hasDrawn.current = true
    const { x, y } = canvasPos(e)
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#1a1a1a'
    ctx.beginPath()
    ctx.moveTo(x, y)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function moveDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = canvasPos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  function endDraw() {
    drawing.current = false
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    hasDrawn.current = false
  }

  async function handleSign() {
    setError(null)
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your first and last name.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }
    if (!consent) {
      setError('Please check the box to authorize your signature.')
      return
    }
    let signatureData = typedName
    if (mode === 'drawn') {
      if (!hasDrawn.current || !canvasRef.current) {
        setError('Please draw your signature.')
        return
      }
      signatureData = canvasRef.current.toDataURL('image/png')
    }

    setSubmitting(true)
    try {
      const token = new URLSearchParams(window.location.search).get('r')
      const res = await fetch(SIGN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          slug,
          token: token || undefined,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          signature_type: mode,
          signature_data: signatureData,
          consent: true,
          deselected_items: deselected ? Array.from(deselected) : [],
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error || 'Something went wrong. Please try again.')
        return
      }
      setJustSigned(data?.signed_at || new Date().toISOString())
      if (data?.payment_url) setPaymentUrl(data.payment_url)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full rounded-md border border-[var(--p-border)] bg-transparent px-3 py-2 text-sm text-[var(--p-ink)] placeholder:text-[var(--p-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--p-ink)]'

  return (
    <div className={`${brandConfig.themeClass} bg-[var(--p-bg)] pb-16`}>
      <div className="mx-auto max-w-3xl px-6 sm:px-10">
        <div className="border-t border-[var(--p-border)] pt-10">
          <p className="mb-6 text-xs uppercase tracking-[0.2em] text-[var(--p-muted)]">
            Acceptance &amp; Signature
          </p>

          {done ? (
            <div className="rounded-md border border-[var(--p-border)] p-6 text-center">
              <p className="font-serif text-xl text-[var(--p-ink)]">This proposal has been signed.</p>
              <p className="mt-1 text-sm text-[var(--p-muted)]">
                Signed on{' '}
                {new Date(done).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              {paymentUrl && (
                <a
                  href={paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block rounded-md bg-[var(--p-ink)] px-8 py-2.5 text-sm font-medium text-[var(--p-bg)] transition-opacity hover:opacity-90"
                >
                  Proceed to Payment
                </a>
              )}
              {paymentUrl && (
                <p className="mt-2 text-xs text-[var(--p-muted)]">
                  An invoice has also been emailed to you.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-[var(--p-muted)]">
                By signing below, you accept this proposal and authorize {brandConfig.name} to
                begin work under the scope, pricing, and payment terms described above.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  className={inputClass}
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                />
                <input
                  className={inputClass}
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                />
              </div>
              <input
                className={inputClass}
                placeholder="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />

              {/* Type / Draw toggle */}
              <div className="flex overflow-hidden rounded-md border border-[var(--p-border)] text-sm">
                {(['typed', 'drawn'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`flex-1 px-3 py-1.5 transition-colors ${
                      mode === m
                        ? 'bg-[var(--p-ink)] text-[var(--p-bg)]'
                        : 'text-[var(--p-muted)] hover:text-[var(--p-ink)]'
                    }`}
                  >
                    {m === 'typed' ? 'Type' : 'Draw'}
                  </button>
                ))}
              </div>

              {mode === 'typed' ? (
                <div className="flex h-28 items-center justify-center rounded-md border border-dashed border-[var(--p-border)]">
                  {typedName ? (
                    <span className="text-3xl text-[var(--p-ink)]" style={{ fontFamily: SCRIPT_FONT }}>
                      {typedName}
                    </span>
                  ) : (
                    <span className="text-sm text-[var(--p-muted)]">
                      Your signature appears here as you type your name
                    </span>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <canvas
                    ref={canvasRef}
                    width={640}
                    height={160}
                    className="h-28 w-full touch-none rounded-md border border-dashed border-[var(--p-border)] bg-white/40"
                    onPointerDown={startDraw}
                    onPointerMove={moveDraw}
                    onPointerUp={endDraw}
                    onPointerLeave={endDraw}
                  />
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="absolute right-2 top-2 text-xs text-[var(--p-muted)] hover:text-[var(--p-ink)]"
                  >
                    Clear
                  </button>
                </div>
              )}

              <label className="flex cursor-pointer items-start gap-2 text-sm text-[var(--p-muted)]">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  I agree that my electronic signature is the legal equivalent of my handwritten
                  signature, and that I am authorized to accept this proposal.
                </span>
              </label>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="button"
                onClick={handleSign}
                disabled={submitting}
                className="w-full rounded-md bg-[var(--p-ink)] px-4 py-2.5 text-sm font-medium text-[var(--p-bg)] transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto sm:px-8"
              >
                {submitting
                  ? 'Signing...'
                  : total && total > 0
                    ? `Sign & Accept - ${'$'}${total.toLocaleString()}`
                    : 'Sign & Accept Proposal'}
              </button>

              <p className="text-xs text-[var(--p-muted)]">
                The date, your IP address, and a copy of this proposal are recorded with your
                signature.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

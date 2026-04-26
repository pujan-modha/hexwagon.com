"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Note } from "~/components/common/note"

type CheckoutStatusPollerProps = {
  checkoutReferenceId: string
}

const MAX_ATTEMPTS = 20
const DEFAULT_DELAY_MS = [2_000, 3_000, 5_000, 8_000, 12_000, 20_000] as const
const RATE_LIMIT_DELAY_MS = 30_000

const getNextDelayMs = (attempt: number): number =>
  DEFAULT_DELAY_MS[Math.min(attempt, DEFAULT_DELAY_MS.length - 1)] ?? 20_000

export const CheckoutStatusPoller = ({ checkoutReferenceId }: CheckoutStatusPollerProps) => {
  const router = useRouter()
  const [attemptCount, setAttemptCount] = useState(0)
  const hasCompletedRef = useRef(false)

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let isUnmounted = false
    const abortController = new AbortController()

    const poll = async (attempt: number) => {
      if (hasCompletedRef.current || isUnmounted || attempt >= MAX_ATTEMPTS) {
        return
      }

      let nextDelayMs: number = getNextDelayMs(attempt)

      try {
        const response = await fetch(
          `/api/paypal/checkout-status?checkoutReferenceId=${encodeURIComponent(checkoutReferenceId)}`,
          {
            cache: "no-store",
            signal: abortController.signal,
          },
        )

        if (response.status === 429) {
          nextDelayMs = RATE_LIMIT_DELAY_MS
        }

        const data = (await response.json()) as {
          isReady?: boolean
        }

        if (data.isReady) {
          hasCompletedRef.current = true
          router.refresh()
          return
        }
      } catch {}

      if (!hasCompletedRef.current && !isUnmounted) {
        const nextAttempt = attempt + 1
        setAttemptCount(nextAttempt)
        timeoutId = setTimeout(() => {
          void poll(nextAttempt)
        }, nextDelayMs)
      }
    }

    timeoutId = setTimeout(() => {
      void poll(0)
    }, 1_000)

    return () => {
      isUnmounted = true
      abortController.abort()

      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [checkoutReferenceId, router])

  return (
    <div className="max-w-2xl mx-auto rounded-md border p-6 space-y-4">
      <h2 className="text-xl font-semibold">Waiting for payment confirmation</h2>
      <p className="text-sm text-muted-foreground">
        Your payment is being confirmed with PayPal. This page will update automatically as soon as
        the subscription webhook is processed.
      </p>
      <Note>
        We retry automatically with backoff. If this takes a few minutes, refresh page or check
        dashboard.
      </Note>
      <p className="text-xs text-muted-foreground">{`Status checks: ${attemptCount}/${MAX_ATTEMPTS}`}</p>
    </div>
  )
}

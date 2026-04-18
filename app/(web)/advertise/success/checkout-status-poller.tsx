"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Note } from "~/components/common/note"

type CheckoutStatusPollerProps = {
  checkoutReferenceId: string
}

export const CheckoutStatusPoller = ({ checkoutReferenceId }: CheckoutStatusPollerProps) => {
  const router = useRouter()
  const [attemptCount, setAttemptCount] = useState(0)
  const hasCompletedRef = useRef(false)

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const poll = async () => {
      if (hasCompletedRef.current) {
        return
      }

      try {
        const response = await fetch(
          `/api/paypal/checkout-status?checkoutReferenceId=${encodeURIComponent(checkoutReferenceId)}`,
          {
            cache: "no-store",
          },
        )
        const data = (await response.json()) as {
          isReady?: boolean
        }

        if (data.isReady) {
          hasCompletedRef.current = true
          router.refresh()
          return
        }
      } catch {}

      if (!hasCompletedRef.current) {
        setAttemptCount(count => count + 1)
        timeoutId = setTimeout(poll, 3_000)
      }
    }

    timeoutId = setTimeout(poll, 1_000)

    return () => {
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
        If this takes more than a minute, keep this page open and we will continue checking in the
        background.
      </Note>
      <p className="text-xs text-muted-foreground">Status checks: {attemptCount}</p>
    </div>
  )
}

"use client"

import * as React from "react"
import { useServerAction } from "zsa-react"
import { toast } from "sonner"
import { Button } from "~/components/common/button"
import { Input } from "~/components/common/input"
import { Note } from "~/components/common/note"
import { updateAdSettings } from "~/server/admin/ads/actions"

type AdDiscountManagerProps = {
  initialMaxDiscountPercentage: number
  initialTargetingUnitPrice: number
}

export const AdDiscountManager = ({
  initialMaxDiscountPercentage,
  initialTargetingUnitPrice,
}: AdDiscountManagerProps) => {
  const [maxDiscountPercentage, setMaxDiscountPercentage] = React.useState(
    String(initialMaxDiscountPercentage),
  )
  const [targetingUnitPrice, setTargetingUnitPrice] = React.useState(
    initialTargetingUnitPrice.toFixed(2),
  )

  const { execute, isPending } = useServerAction(updateAdSettings, {
    onSuccess: () => toast.success("Discount cap updated."),
    onError: ({ err }) => toast.error(err.message),
  })

  const handleSave = () => {
    const parsed = Number(maxDiscountPercentage)
    const parsedTargetingUnitPrice = Number(targetingUnitPrice)

    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
      toast.error("Discount cap must be an integer between 0 and 100.")
      return
    }

    if (!Number.isFinite(parsedTargetingUnitPrice) || parsedTargetingUnitPrice < 0) {
      toast.error("Targeting surcharge must be zero or greater.")
      return
    }

    execute({
      maxDiscountPercentage: parsed,
      targetingUnitPrice: parsedTargetingUnitPrice,
    })
  }

  return (
    <div className="rounded-sm border border-border">
      <div className="flex items-start justify-between gap-4 border-b p-5">
        <div className="space-y-1">
          <p className="text-sm font-medium">Discount + Targeting Settings</p>
          <Note>
            Configure checkout discount cap and extra pricing for each targeted theme or platform on sidebar ads.
          </Note>
        </div>

        <Button size="sm" onClick={handleSave} disabled={isPending} className="shrink-0">
          {isPending ? "Saving…" : "Save cap"}
        </Button>
      </div>

      <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
        <div className="flex items-center gap-4">
          <div className="w-36 shrink-0">
            <p className="text-sm font-medium">Max discount</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60">percent</p>
          </div>

          <div className="relative flex-1 max-w-[160px]">
            <Input
              type="number"
              step="1"
              min="0"
              max="100"
              value={maxDiscountPercentage}
              onChange={event => setMaxDiscountPercentage(event.target.value)}
              disabled={isPending}
              className="h-8 text-sm tabular-nums"
              aria-label="Maximum discount percentage"
            />
          </div>

          <p className="text-xs text-muted-foreground whitespace-nowrap">% off</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-36 shrink-0">
            <p className="text-sm font-medium">Target surcharge</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60">per theme/platform</p>
          </div>

          <div className="relative flex-1 max-w-[160px]">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">
              $
            </span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={targetingUnitPrice}
              onChange={event => setTargetingUnitPrice(event.target.value)}
              disabled={isPending}
              className="h-8 pl-6 text-sm tabular-nums"
              aria-label="Per target surcharge"
            />
          </div>

          <p className="text-xs text-muted-foreground whitespace-nowrap">each</p>
        </div>
      </div>
    </div>
  )
}
"use client"

import * as React from "react"
import { toast } from "sonner"
import { useServerAction } from "zsa-react"
import { Button } from "~/components/common/button"
import { Input } from "~/components/common/input"
import { Note } from "~/components/common/note"
import { updateAdSettings } from "~/server/admin/ads/actions"

type AdDiscountManagerProps = {
  initialMaxDiscountPercentage: number
}

export const AdDiscountManager = ({ initialMaxDiscountPercentage }: AdDiscountManagerProps) => {
  const [maxDiscountPercentage, setMaxDiscountPercentage] = React.useState(
    String(initialMaxDiscountPercentage),
  )

  const { execute, isPending } = useServerAction(updateAdSettings, {
    onSuccess: () => toast.success("Discount cap updated."),
    onError: ({ err }) => toast.error(err.message),
  })

  const handleSave = () => {
    const parsed = Number(maxDiscountPercentage)

    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
      toast.error("Discount cap must be an integer between 0 and 100.")
      return
    }

    execute({
      maxDiscountPercentage: parsed,
    })
  }

  return (
    <div className="rounded-sm border border-border">
      <div className="flex items-start justify-between gap-4 border-b p-5">
        <div className="space-y-1">
          <p className="text-sm font-medium">Discount Settings</p>
          <Note>Configure checkout discount cap.</Note>
        </div>

        <Button size="sm" onClick={handleSave} disabled={isPending} className="shrink-0">
          {isPending ? "Saving…" : "Save cap"}
        </Button>
      </div>

      <div className="grid gap-4 px-5 py-4">
        <div className="flex items-center gap-4">
          <div className="w-36 shrink-0">
            <p className="text-sm font-medium">Max discount</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
              percent
            </p>
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
      </div>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { Button } from "~/components/common/button"
import type { ButtonProps } from "~/components/common/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/common/dialog"
import { Label } from "~/components/common/label"
import { TextArea } from "~/components/common/textarea"

type RejectDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onReject: (reason: string) => void | Promise<void>
  pending?: boolean
  reasonLabel?: string
  reasonPlaceholder?: string
  confirmLabel?: string
  confirmVariant?: ButtonProps["variant"]
}

export const RejectDialog = ({
  open,
  onOpenChange,
  title,
  description,
  onReject,
  pending,
  reasonLabel = "Reason",
  reasonPlaceholder = "Explain why the booking is being rejected...",
  confirmLabel = "Reject ad",
  confirmVariant = "destructive",
}: RejectDialogProps) => {
  const [reason, setReason] = useState("")

  useEffect(() => {
    if (!open) setReason("")
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="rejection-reason">{reasonLabel}</Label>
          <TextArea
            id="rejection-reason"
            value={reason}
            onChange={event => setReason(event.target.value)}
            placeholder={reasonPlaceholder}
            className="min-h-28"
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>

          <Button
            variant={confirmVariant}
            disabled={!reason.trim() || pending}
            isPending={pending}
            onClick={async () => {
              await onReject(reason.trim())
              onOpenChange(false)
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

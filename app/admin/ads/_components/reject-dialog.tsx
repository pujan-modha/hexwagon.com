"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/common/dialog"
import { Button } from "~/components/common/button"
import { Label } from "~/components/common/label"
import { TextArea } from "~/components/common/textarea"

type RejectDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onReject: (reason: string) => void | Promise<void>
  pending?: boolean
}

export const RejectDialog = ({
  open,
  onOpenChange,
  title,
  description,
  onReject,
  pending,
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
          <Label htmlFor="rejection-reason">Reason</Label>
          <TextArea
            id="rejection-reason"
            value={reason}
            onChange={event => setReason(event.target.value)}
            placeholder="Explain why the booking is being rejected..."
            className="min-h-28"
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>

          <Button
            variant="destructive"
            disabled={!reason.trim() || pending}
            isPending={pending}
            onClick={async () => {
              await onReject(reason.trim())
              onOpenChange(false)
            }}
          >
            Reject ad
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
"use client"

import { useState } from "react"
import { toast } from "sonner"
import { useServerAction } from "zsa-react"
import { Button } from "~/components/common/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/common/dropdown-menu"
import { Icon } from "~/components/common/icon"
import {
  approveAd,
  cancelAd,
  rejectAd,
  requestAdChanges,
  setAdminAdActive,
} from "~/server/admin/ads/actions"
import type { AdAdminMany } from "~/server/admin/ads/payloads"
import { AdFormDialog } from "./ad-form-dialog"
import { RejectDialog } from "./reject-dialog"

type AdActionsProps = {
  ad: AdAdminMany
}

export const AdActions = ({ ad }: AdActionsProps) => {
  const isAdminManagedAd =
    !ad.billingProvider &&
    !ad.billingCheckoutReferenceId &&
    !ad.billingLastPaymentId &&
    !ad.billingSubscriptionId

  const approveAction = useServerAction(approveAd, {
    onError: ({ err }) => toast.error(err.message),
  })

  const rejectAction = useServerAction(rejectAd, {
    onError: ({ err }) => toast.error(err.message),
  })

  const cancelAction = useServerAction(cancelAd, {
    onError: ({ err }) => toast.error(err.message),
  })

  const requestChangesAction = useServerAction(requestAdChanges, {
    onError: ({ err }) => toast.error(err.message),
  })

  const setActiveAction = useServerAction(setAdminAdActive, {
    onError: ({ err }) => toast.error(err.message),
  })

  const [rejectOpen, setRejectOpen] = useState(false)
  const [requestChangesOpen, setRequestChangesOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  return (
    <div className="flex justify-end">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="Open ad actions"
            size="sm"
            variant="secondary"
            prefix={<Icon name="lucide/ellipsis" />}
          />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" sideOffset={8}>
          {!isAdminManagedAd && ad.status !== "Approved" && (
            <DropdownMenuItem onSelect={() => approveAction.execute({ id: ad.id })}>
              Approve
            </DropdownMenuItem>
          )}

          {!isAdminManagedAd && ad.status !== "Rejected" && (
            <DropdownMenuItem onSelect={() => setRejectOpen(true)}>Reject</DropdownMenuItem>
          )}

          {!isAdminManagedAd && ad.status !== "Rejected" && ad.status !== "Cancelled" && (
            <DropdownMenuItem onSelect={() => setRequestChangesOpen(true)}>
              Request changes
            </DropdownMenuItem>
          )}

          {isAdminManagedAd && (
            <DropdownMenuItem
              onSelect={() =>
                setActiveAction.execute({
                  id: ad.id,
                  isActive: ad.status !== "Approved",
                })
              }
            >
              {ad.status === "Approved" ? "Set inactive" : "Set active"}
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem onSelect={() => setEditOpen(true)}>Edit</DropdownMenuItem>

          {ad.status !== "Cancelled" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={event => {
                  event.preventDefault()
                  cancelAction.execute({ id: ad.id })
                }}
                className="text-red-500"
              >
                Cancel
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <RejectDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject ad booking"
        description="Provide a reason. It will be emailed to the advertiser and paid campaigns are refunded in full."
        pending={rejectAction.isPending}
        onReject={async reason => {
          await rejectAction.execute({ adId: ad.id, reason })
        }}
      />

      <RejectDialog
        open={requestChangesOpen}
        onOpenChange={setRequestChangesOpen}
        title="Request ad changes"
        description="Ask the advertiser to revise this booking. Your notes will be emailed and the ad will move to pending edits."
        pending={requestChangesAction.isPending}
        reasonLabel="Requested changes"
        reasonPlaceholder="Explain what should be updated before approval..."
        confirmLabel="Request changes"
        confirmVariant="primary"
        onReject={async reason => {
          await requestChangesAction.execute({ adId: ad.id, reason })
        }}
      />

      <AdFormDialog open={editOpen} onOpenChange={setEditOpen} ad={ad} />
    </div>
  )
}

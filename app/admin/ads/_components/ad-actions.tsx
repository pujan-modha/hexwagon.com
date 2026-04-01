"use client";

import { useState } from "react";
import type { AdAdminMany } from "~/server/admin/ads/payloads";
import { useServerAction } from "zsa-react";
import { toast } from "sonner";
import { Button } from "~/components/common/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/common/dropdown-menu";
import { Icon } from "~/components/common/icon";
import { approveAd, cancelAd, rejectAd } from "~/server/admin/ads/actions";
import type { AdPricingMap } from "~/server/web/ads/queries";
import { AdFormDialog } from "./ad-form-dialog";
import { RejectDialog } from "./reject-dialog";

type AdActionsProps = {
  ad: AdAdminMany;
  pricing: AdPricingMap;
};

export const AdActions = ({ ad, pricing }: AdActionsProps) => {
  const approveAction = useServerAction(approveAd, {
    onError: ({ err }) => toast.error(err.message),
  });

  const rejectAction = useServerAction(rejectAd, {
    onError: ({ err }) => toast.error(err.message),
  });

  const cancelAction = useServerAction(cancelAd, {
    onError: ({ err }) => toast.error(err.message),
  });

  const [rejectOpen, setRejectOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

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
          {ad.status !== "Approved" && (
            <DropdownMenuItem
              onSelect={() => approveAction.execute({ id: ad.id })}
            >
              Approve
            </DropdownMenuItem>
          )}

          {ad.status !== "Rejected" && (
            <DropdownMenuItem onSelect={() => setRejectOpen(true)}>
              Reject
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            Edit
          </DropdownMenuItem>

          {ad.status !== "Cancelled" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  cancelAction.execute({ id: ad.id });
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
        description="Provide a reason. It will be emailed to the advertiser."
        pending={rejectAction.isPending}
        onReject={async (reason) => {
          await rejectAction.execute({ adId: ad.id, reason });
        }}
      />

      <AdFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        ad={ad}
        pricing={pricing}
      />
    </div>
  );
};

"use client";

import type { AdSlot } from "@prisma/client";
import { toast } from "sonner";
import { useServerAction } from "zsa-react";
import { Button } from "~/components/common/button";
import { Note } from "~/components/common/note";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/common/select";
import { setAdFixedSlotOverride } from "~/server/admin/ads/actions";

type FixedSlotCandidate = {
  id: string;
  name: string;
  websiteUrl: string;
};

type AdFixedSlotOverrideManagerProps = {
  overrides: Record<AdSlot, { adId: string | null; adName: string | null }>;
  candidates: FixedSlotCandidate[];
};

const slotOrder: AdSlot[] = ["Banner", "Listing", "Sidebar", "Footer"];

export const AdFixedSlotOverrideManager = ({
  overrides,
  candidates,
}: AdFixedSlotOverrideManagerProps) => {
  const { execute, isPending } = useServerAction(setAdFixedSlotOverride, {
    onSuccess: () => toast.success("Fixed slot override updated."),
    onError: ({ err }) => toast.error(err.message),
  });

  return (
    <div className="rounded-sm border border-border">
      <div className="flex items-start justify-between gap-4 border-b p-5">
        <div className="space-y-1">
          <p className="text-sm font-medium">Fixed Slot Overrides</p>
          <Note>
            Pin a paid approved ad to a slot. Pinned ads always win until
            removed.
          </Note>
        </div>
      </div>

      <div className="grid gap-4 px-5 py-4">
        {slotOrder.map((slot) => {
          const current = overrides[slot];

          return (
            <div
              key={slot}
              className="grid gap-2 rounded-md border border-border/70 p-3 sm:grid-cols-[120px_1fr_auto] sm:items-center"
            >
              <p className="text-sm font-medium">{slot}</p>

              <Select
                value={current.adId ?? "none"}
                onValueChange={(value) => {
                  execute({
                    slot,
                    adId: value === "none" ? null : value,
                  });
                }}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No fixed ad" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="none">No fixed ad</SelectItem>
                  {candidates.map((ad) => (
                    <SelectItem key={ad.id} value={ad.id}>
                      {ad.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="sm"
                disabled={isPending || !current.adId}
                onClick={() => execute({ slot, adId: null })}
              >
                Clear
              </Button>

              {current.adId && current.adName && (
                <p className="text-xs text-muted-foreground sm:col-start-2">
                  Pinned: {current.adName}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

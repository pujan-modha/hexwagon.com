"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useServerAction } from "zsa-react";
import { removeLike } from "~/actions/like";
import { Button } from "~/components/common/button";
import { Icon } from "~/components/common/icon";

type EntityType = "port" | "theme" | "platform";

type DashboardUnlikeButtonProps = {
  entityType: EntityType;
  entityId: string;
};

export const DashboardUnlikeButton = ({
  entityType,
  entityId,
}: DashboardUnlikeButtonProps) => {
  const router = useRouter();

  const unlikeAction = useServerAction(removeLike, {
    onSuccess: () => {
      toast.success("Removed from likes.");
      router.refresh();
    },
    onError: ({ err }) => toast.error(err.message),
  });

  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      className="absolute right-2 top-2 z-20 h-7 px-2 text-[11px]"
      prefix={<Icon name="lucide/x" />}
      isPending={unlikeAction.isPending}
      onClick={() => unlikeAction.execute({ entityType, entityId })}
      aria-label="Remove from likes"
      title="Remove from likes"
    >
      Unlike
    </Button>
  );
};

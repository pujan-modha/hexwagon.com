import type { ComponentProps } from "react";
import { Icon } from "~/components/common/icon";
import { Tooltip } from "~/components/common/tooltip";
import { cx } from "~/utils/cva";

type VerifiedBadgeProps = Omit<ComponentProps<typeof Icon>, "name"> & {
  size?: "xs" | "sm" | "md" | "lg";
};

export const VerifiedBadge = ({
  className,
  size = "md",
  ...props
}: VerifiedBadgeProps) => {
  return (
    <Tooltip tooltip="Verified">
      <Icon
        name="verified-badge"
        className={cx(
          "shrink-0 stroke-0",
          size === "xs" && "size-4",
          size === "sm" && " size-5",
          size === "md" && " size-6",
          size === "lg" && " size-7",
          className,
        )}
        {...props}
      />
    </Tooltip>
  );
};

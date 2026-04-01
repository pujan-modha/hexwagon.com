import type { ReactNode } from "react";
import { cx } from "~/utils/cva";

type EntityHeaderActionsProps = {
  primaryAction?: ReactNode;
  children: ReactNode;
  className?: string;
};

export const EntityHeaderActions = ({
  primaryAction,
  children,
  className,
}: EntityHeaderActionsProps) => {
  return (
    <div className={cx("flex items-center gap-2", className)}>
      {primaryAction}

      <div
        className={cx(
          "inline-flex items-center overflow-hidden rounded-lg border border-border/70 bg-background/70",
          "supports-[backdrop-filter]:bg-background/60",
          "[&>*+*]:border-l [&>*+*]:border-border/60",
        )}
      >
        {children}
      </div>
    </div>
  );
};

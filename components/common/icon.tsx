import type { SVGProps } from "react"
import type { IconName } from "~/types/icons"
import { cx } from "~/utils/cva"

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName
}

export const Icon = ({ name, className, fill, stroke, ...props }: IconProps) => {
  const isFontAwesome = name.startsWith("fontawesome/")

  return (
    <svg
      className={cx("size-[1em]", className)}
      role="img"
      fill={fill ?? (isFontAwesome ? "currentColor" : undefined)}
      stroke={stroke ?? (isFontAwesome ? "none" : "currentColor")}
      aria-label={`${name} icon`}
      {...props}
    >
      <use href={`/icons/sprite.svg#${name}`} />
    </svg>
  )
}

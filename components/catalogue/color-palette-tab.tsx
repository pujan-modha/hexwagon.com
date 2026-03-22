import type { ComponentProps } from "react"
import type { Prisma } from "@prisma/client"
import { toast } from "sonner"
import { Card } from "~/components/common/card"
import { cn } from "~/utils/cva"

type ColorPaletteTabProps = {
  colors: Prisma.ColorPaletteGetPayload<{ select: { id: true; label: true; hex: true; order: true } }>[]
  className?: string
}

const ColorPaletteTab = ({ colors, className }: ColorPaletteTabProps) => {
  if (!colors.length) {
    return (
      <Card className={cn("p-6 text-muted-foreground", className)}>
        No color palette available for this theme.
      </Card>
    )
  }

  const copyToClipboard = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex)
      toast.success(`Copied ${hex} to clipboard`)
    } catch {
      toast.error("Failed to copy")
    }
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {colors.map(color => (
          <button
            key={color.id}
            type="button"
            onClick={() => copyToClipboard(color.hex)}
            className="flex flex-col items-center gap-2 rounded-lg p-2 transition-colors hover:bg-muted/50"
          >
            <div
              className="size-12 w-full rounded-lg border shadow-sm"
              style={{ backgroundColor: color.hex }}
            />
            <span className="text-xs font-medium">{color.label}</span>
            <span className="font-mono text-xs text-muted-foreground">{color.hex}</span>
          </button>
        ))}
      </div>
    </Card>
  )
}

export { ColorPaletteTab }

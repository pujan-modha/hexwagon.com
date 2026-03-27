"use client"

import type { ComponentProps } from "react"
import type { Prisma } from "@prisma/client"
import { toast } from "sonner"
import { Card } from "~/components/common/card"
import { Icon } from "~/components/common/icon"
import { cn } from "~/utils/cva"

type ColorPayload = Prisma.ColorPaletteGetPayload<{ select: { id: true; label: true; hex: true; order: true; paletteName: true } }>

type ColorPaletteTabProps = {
  colors: ColorPayload[]
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

  // Group colors by paletteName
  const groupedColors = colors.reduce((acc, color) => {
    const pName = color.paletteName || "Default"
    if (!acc[pName]) {
      acc[pName] = []
    }
    acc[pName].push(color)
    return acc
  }, {} as Record<string, ColorPayload[]>)

  const paletteNames = Object.keys(groupedColors)
  const defaultTab = paletteNames[0]

  const PaletteTable = ({ paletteColors }: { paletteColors: ColorPayload[] }) => (
    <div className="flex w-min mx-auto overflow-x-auto border-[6px] border-muted rounded-lg scrollbar-hide">
      <table className="w-max m-0 p-0 border-collapse bg-muted text-left text-[13px] text-foreground flex-none">
        <thead>
          <tr>
            <th className="min-w-[9rem] px-5 py-3 font-semibold text-foreground/70">Token</th>
            <th className="min-w-[13rem] px-5 py-3 font-semibold text-foreground/70">Copy</th>
            <th className="min-w-[13rem] px-5 py-3 font-semibold text-foreground/70">Color</th>
          </tr>
        </thead>
        <tbody className="bg-background">
          {paletteColors.map((color, index) => (
            <tr 
              key={color.id} 
              className={cn(
                "transition-colors duration-200 hover:bg-muted focus:bg-muted group",
                index === 0 && "[&>td:first-child]:rounded-tl-md [&>td:last-child]:rounded-tr-md",
                index === paletteColors.length - 1 && "[&>td:first-child]:rounded-bl-md [&>td:last-child]:rounded-br-md"
              )}
            >
              <td className="min-w-[9rem] px-5 py-3 font-medium">{color.label}</td>
              <td className="min-w-[13rem] px-5 py-3">
                <button 
                  type="button"
                  onClick={() => copyToClipboard(color.hex)}
                  className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground group-hover:text-foreground transition-colors"
                  title={`Copy ${color.hex}`}
                >
                  <Icon name="lucide/hash" className="size-3.5 opacity-50 relative top-px" />
                  <span>{color.hex.replace(/^#/, '')}</span>
                </button>
              </td>
              <td 
                className="min-w-[13rem] p-0 m-0"
                style={{ backgroundColor: color.hex }}
              />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className={cn("flex flex-col gap-12 w-full", className)}>
      {Object.entries(groupedColors).map(([name, paletteColors]) => (
        <div key={name} className="flex flex-col gap-2 w-full">
          {paletteNames.length > 1 && (
            <h3 className="text-lg font-semibold tracking-tight px-1 max-w-full text-center mx-auto w-full">{name}</h3>
          )}
          <PaletteTable paletteColors={paletteColors} />
        </div>
      ))}
    </div>
  )
}

export { ColorPaletteTab }

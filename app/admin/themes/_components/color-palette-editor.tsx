"use client"

import type { ColorPalette } from "@prisma/client"
import { useCallback, useState } from "react"
import { toast } from "sonner"
import { useServerAction } from "zsa-react"
import { Button } from "~/components/common/button"
import { H3 } from "~/components/common/heading"
import { Icon } from "~/components/common/icon"
import { Input } from "~/components/common/input"
import { Stack } from "~/components/common/stack"
import {
  deleteColorPaletteEntry,
  upsertColorPaletteEntry,
} from "~/server/admin/themes/actions"
import { cx } from "~/utils/cva"

type LocalColor = {
  // Temporary local-only id for new unsaved entries
  localId: string
  id?: string
  label: string
  hex: string
  order: number
}

type ColorPaletteEditorProps = {
  themeId: string
  themeSlug: string
  initialColors: ColorPalette[]
}

let localCounter = 0
const newLocalId = () => `local-${++localCounter}`

const toLocal = (c: ColorPalette): LocalColor => ({
  localId: c.id,
  id: c.id,
  label: c.label,
  hex: c.hex,
  order: c.order,
})

export function ColorPaletteEditor({
  themeId,
  themeSlug,
  initialColors,
}: ColorPaletteEditorProps) {
  const [colors, setColors] = useState<LocalColor[]>(
    [...initialColors]
      .sort((a, b) => a.order - b.order)
      .map(toLocal),
  )

  const { execute: upsert } = useServerAction(upsertColorPaletteEntry, {
    onSuccess: ({ data }) => {
      // Promote local entry to persisted (assign real id)
      setColors(prev =>
        prev.map(c =>
          c.id === data.id || (c.id === undefined && c.hex === data.hex && c.label === data.label)
            ? { ...c, id: data.id, localId: data.id }
            : c,
        ),
      )
    },
    onError: ({ err }) => toast.error(err.message),
  })

  const { execute: del } = useServerAction(deleteColorPaletteEntry, {
    onError: ({ err }) => toast.error(err.message),
  })

  const handleAddColor = () => {
    setColors(prev => [
      ...prev,
      { localId: newLocalId(), label: "", hex: "#000000", order: prev.length },
    ])
  }

  const handleBlur = useCallback(
    (c: LocalColor) => {
      if (!c.label.trim()) return
      upsert({
        id: c.id,
        themeId,
        label: c.label,
        hex: c.hex,
        order: c.order,
      })
    },
    [upsert, themeId],
  )

  const handleHexPickerChange = (localId: string, hex: string) => {
    setColors(prev =>
      prev.map(c => (c.localId === localId ? { ...c, hex } : c)),
    )
  }

  const handleHexInputChange = (localId: string, raw: string) => {
    // Normalize: always store with leading #
    const val = raw.startsWith("#") ? raw : `#${raw}`
    setColors(prev =>
      prev.map(c => (c.localId === localId ? { ...c, hex: val } : c)),
    )
  }

  const handleLabelChange = (localId: string, label: string) => {
    setColors(prev =>
      prev.map(c => (c.localId === localId ? { ...c, label } : c)),
    )
  }

  const handleDelete = (c: LocalColor) => {
    setColors(prev => prev.filter(x => x.localId !== c.localId))
    if (c.id) {
      del({ id: c.id, themeSlug })
    }
  }

  return (
    <div className="col-span-full flex flex-col gap-3">
      <Stack className="justify-between">
        <H3>Color Palette</H3>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={handleAddColor}
          prefix={<Icon name="lucide/plus" />}
          className="-my-0.5"
        >
          Add color
        </Button>
      </Stack>

      {colors.length === 0 && (
        <p className="text-secondary-foreground text-[0.8125rem]">
          No colors yet. Click &quot;Add color&quot; to define the palette.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {colors.map(c => (
          <ColorRow
            key={c.localId}
            color={c}
            onHexPickerChange={hex => handleHexPickerChange(c.localId, hex)}
            onHexInputChange={raw => handleHexInputChange(c.localId, raw)}
            onLabelChange={label => handleLabelChange(c.localId, label)}
            onBlur={() => handleBlur(c)}
            onDelete={() => handleDelete(c)}
          />
        ))}
      </div>
    </div>
  )
}

type ColorRowProps = {
  color: LocalColor
  onHexPickerChange: (hex: string) => void
  onHexInputChange: (raw: string) => void
  onLabelChange: (label: string) => void
  onBlur: () => void
  onDelete: () => void
}

function ColorRow({
  color,
  onHexPickerChange,
  onHexInputChange,
  onLabelChange,
  onBlur,
  onDelete,
}: ColorRowProps) {
  // Validate hex for picker — must be exactly #rrggbb
  const pickerHex = /^#[0-9A-Fa-f]{6}$/.test(color.hex) ? color.hex : "#000000"

  return (
    <div className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-2">
      {/* Color swatch picker */}
      <div
        className={cx(
          "relative size-9 shrink-0 rounded-md border overflow-hidden",
          "focus-within:outline-[3px] focus-within:outline-border/50 focus-within:border-outline",
        )}
        style={{ backgroundColor: pickerHex }}
      >
        <input
          type="color"
          value={pickerHex}
          onChange={e => onHexPickerChange(e.target.value)}
          onBlur={onBlur}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
          title="Pick color"
        />
      </div>

      {/* Hex input */}
      <div className="w-28 shrink-0">
        <Input
          type="text"
          value={color.hex}
          maxLength={7}
          placeholder="#000000"
          onChange={e => onHexInputChange(e.target.value)}
          onBlur={onBlur}
          className="font-mono uppercase text-xs"
        />
      </div>

      {/* Label input */}
      <Input
        type="text"
        value={color.label}
        placeholder="e.g. Background"
        onChange={e => onLabelChange(e.target.value)}
        onBlur={onBlur}
      />

      {/* Delete */}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={onDelete}
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
        aria-label="Delete color"
      >
        <Icon name="lucide/trash" />
      </Button>
    </div>
  )
}

"use client"

import type { UseFormReturn } from "react-hook-form"
import { useFieldArray } from "react-hook-form"
import { Button } from "~/components/common/button"
import { Icon } from "~/components/common/icon"
import { Input } from "~/components/common/input"
import { cx } from "~/utils/cva"

type PaletteGroupEditorProps = {
  form: UseFormReturn<any>
  paletteIndex: number
  removePalette: () => void
}

export function PaletteGroupEditor({ form, paletteIndex, removePalette }: PaletteGroupEditorProps) {
  const { fields: colorFields, append: appendColor, remove: removeColor } = useFieldArray({
    control: form.control,
    name: `palettes.${paletteIndex}.colors` as const,
  })

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 bg-muted/20">
      <div className="flex items-center justify-between gap-4 border-b border-border/50 pb-3 mb-1">
        <div className="flex-1 max-w-sm">
          <Input 
            placeholder="Palette Name (e.g. Mocha)"
            {...form.register(`palettes.${paletteIndex}.name`)}
            className="font-medium bg-background"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => appendColor({ label: "", hex: "#000000", order: colorFields.length })}
            prefix={<Icon name="lucide/plus" />}
          >
            Add color
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={removePalette}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Icon name="lucide/trash" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {colorFields.length === 0 && (
          <p className="text-secondary-foreground text-xs italic py-2">No colors in this palette.</p>
        )}
        
        {colorFields.map((colorField, cIndex) => {
          const pickerPath = `palettes.${paletteIndex}.colors.${cIndex}.hex`
          const currentHex = form.watch(pickerPath)
          const pickerHex = /^#[0-9A-Fa-f]{6}$/.test(currentHex) ? currentHex : "#000000"

          return (
             <div key={colorField.id} className="grid grid-cols-[auto_120px_1fr_auto] items-center gap-2">
               {/* Swatch color picker */}
               <div
                 className={cx(
                   "relative size-9 shrink-0 rounded-md border bg-background overflow-hidden",
                   "focus-within:outline-[3px] focus-within:outline-border/50 focus-within:border-outline",
                 )}
                 style={{ backgroundColor: pickerHex }}
               >
                 <input
                   type="color"
                   value={pickerHex}
                   onChange={e => form.setValue(pickerPath, e.target.value)}
                   className="absolute inset-0 size-full cursor-pointer opacity-0"
                   title="Pick color"
                 />
               </div>

               {/* Hex input */}
               <div className="shrink-0">
                 <Input
                   type="text"
                   maxLength={7}
                   placeholder="#000000"
                   className="font-mono uppercase text-xs bg-background"
                   {...form.register(`palettes.${paletteIndex}.colors.${cIndex}.hex`)}
                 />
               </div>

               {/* Label input */}
               <Input
                 type="text"
                 placeholder="Label (e.g. Background)"
                 className="bg-background"
                 {...form.register(`palettes.${paletteIndex}.colors.${cIndex}.label`)}
               />

               {/* Delete */}
               <Button
                 type="button"
                 size="sm"
                 variant="ghost"
                 onClick={() => removeColor(cIndex)}
                 className="text-destructive hover:text-destructive hover:bg-destructive/10"
               >
                 <Icon name="lucide/trash" />
               </Button>
             </div>
          )
        })}
      </div>
    </div>
  )
}

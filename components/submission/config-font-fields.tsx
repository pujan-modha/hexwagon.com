"use client"

import { Button } from "~/components/common/button"
import { Input } from "~/components/common/input"
import { Label } from "~/components/common/label"
import { Note } from "~/components/common/note"

type ConfigFont = {
  name: string
  url: string
}

type ConfigFontFieldsProps = {
  fonts: ConfigFont[]
  onChange: (fonts: ConfigFont[]) => void
}

export const ConfigFontFields = ({ fonts, onChange }: ConfigFontFieldsProps) => {
  const handleFontChange = (index: number, nextFont: ConfigFont) =>
    onChange(fonts.map((font, fontIndex) => (fontIndex === index ? nextFont : font)))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <Label>Fonts Used</Label>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onChange([...fonts, { name: "", url: "" }])}
        >
          Add Font
        </Button>
      </div>

      <Note>Add font name and link. Example: JetBrains Mono, Geist Mono, Berkeley Mono.</Note>

      {fonts.length ? (
        <div className="flex flex-col gap-3">
          {fonts.map((font, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_1fr_auto]"
            >
              <Input
                value={font.name}
                onChange={event =>
                  handleFontChange(index, {
                    ...font,
                    name: event.target.value,
                  })
                }
                placeholder="Font name"
              />

              <Input
                type="url"
                value={font.url}
                onChange={event =>
                  handleFontChange(index, {
                    ...font,
                    url: event.target.value,
                  })
                }
                placeholder="https://font-link.example"
              />

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onChange(fonts.filter((_, fontIndex) => fontIndex !== index))}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <Note>No fonts added yet.</Note>
      )}
    </div>
  )
}

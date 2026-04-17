"use client"

import Image from "next/image"
import { useId, useState } from "react"
import { toast } from "sonner"
import { useServerAction } from "zsa-react"
import { uploadImageToS3 } from "~/actions/media"
import { Button } from "~/components/common/button"
import { Input } from "~/components/common/input"
import { Label } from "~/components/common/label"
import { Note } from "~/components/common/note"
import { IMAGE_ACCEPT } from "~/lib/media-constants"

type ConfigScreenshotFieldsProps = {
  screenshots: string[]
  onChange: (screenshots: string[]) => void
  uploadPath: string
  maxScreenshots?: number
}

const MAX_SCREENSHOTS = 12

export const ConfigScreenshotFields = ({
  screenshots,
  onChange,
  uploadPath,
  maxScreenshots = MAX_SCREENSHOTS,
}: ConfigScreenshotFieldsProps) => {
  const inputId = useId()
  const [pendingUrl, setPendingUrl] = useState("")
  const { execute, isPending } = useServerAction(uploadImageToS3)

  const maxReached = screenshots.length >= maxScreenshots

  const handleAddUrl = () => {
    const normalizedUrl = pendingUrl.trim()

    if (!normalizedUrl) {
      return
    }

    if (screenshots.includes(normalizedUrl)) {
      toast.error("Screenshot already added.")
      return
    }

    if (maxReached) {
      toast.error(`You can add up to ${maxScreenshots} screenshots.`)
      return
    }

    onChange([...screenshots, normalizedUrl])
    setPendingUrl("")
  }

  const handleFileUpload = async (files: FileList | null) => {
    if (!files?.length) {
      return
    }

    const remaining = maxScreenshots - screenshots.length

    if (remaining <= 0) {
      toast.error(`You can add up to ${maxScreenshots} screenshots.`)
      return
    }

    const uploadedUrls: string[] = []

    for (const [index, file] of Array.from(files).slice(0, remaining).entries()) {
      const [data, error] = await execute({
        file,
        path: `${uploadPath}/${Date.now()}-${index}`,
      })

      if (error) {
        toast.error(error.message)
        continue
      }

      if (data) {
        uploadedUrls.push(data)
      }
    }

    if (uploadedUrls.length) {
      onChange([...screenshots, ...uploadedUrls])
      toast.success(
        `${uploadedUrls.length} screenshot${uploadedUrls.length === 1 ? "" : "s"} uploaded.`,
      )
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={inputId}>Config Screenshots</Label>
        <span className="text-xs text-muted-foreground">
          {screenshots.length}/{maxScreenshots}
        </span>
      </div>

      <Note>
        Upload PNG, JPG, WebP, GIF, AVIF, or SVG screenshots up to 8MB each, or paste direct image
        URLs. You can also embed images in full description markdown using direct GitHub or CDN
        URLs.
      </Note>

      <div className="flex flex-col gap-3 rounded-lg border p-3">
        <div className="flex flex-col gap-2 md:flex-row">
          <Input
            id={inputId}
            type="url"
            value={pendingUrl}
            onChange={event => setPendingUrl(event.target.value)}
            placeholder="https://example.com/screenshot.webp"
            disabled={maxReached}
          />
          <Button type="button" variant="secondary" onClick={handleAddUrl} disabled={maxReached}>
            Add URL
          </Button>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Input
            type="file"
            accept={IMAGE_ACCEPT}
            multiple
            disabled={maxReached || isPending}
            onChange={event => {
              void handleFileUpload(event.target.files)
              event.target.value = ""
            }}
          />
          <Note>{isPending ? "Uploading..." : "Choose one or more local files."}</Note>
        </div>
      </div>

      {screenshots.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {screenshots.map((screenshot, index) => (
            <div key={`${screenshot}-${index}`} className="rounded-lg border p-3">
              <div className="overflow-hidden rounded-md border bg-muted/20">
                <Image
                  src={screenshot}
                  alt={`Config screenshot ${index + 1}`}
                  width={1280}
                  height={720}
                  className="aspect-video h-auto w-full object-cover object-top"
                />
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <a
                  href={screenshot}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-sm text-muted-foreground underline"
                >
                  {screenshot}
                </a>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    onChange(screenshots.filter((_, itemIndex) => itemIndex !== index))
                  }
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

"use client"

import { ConfigStatus } from "@prisma/client"
import { useRouter } from "next/navigation"
import { useCallback, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { useServerAction } from "zsa-react"
import { submitConfigEdit } from "~/actions/config-edit"
import { searchPlatformsAction, searchThemesAction } from "~/actions/widget-search"
import { Button } from "~/components/common/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/common/dialog"
import { Input } from "~/components/common/input"
import { Label } from "~/components/common/label"
import { TextArea } from "~/components/common/textarea"
import { ConfigFontFields } from "~/components/submission/config-font-fields"
import { ConfigScreenshotFields } from "~/components/submission/config-screenshot-fields"
import { EntityMultiSelect } from "~/components/submission/entity-multi-select"
import { type ConfigFont, parseConfigFonts, parseConfigScreenshots } from "~/lib/configs"

type PendingEdit = {
  id: string
  diff: unknown
}

type EditableConfigFields = {
  name: string
  description: string
  content: string
  repositoryUrl: string
  license: string
  themeIds: string[]
  themeNames: string[]
  platformIds: string[]
  platformNames: string[]
  fonts: ConfigFont[]
  screenshots: string[]
}

type ConfigEditDialogProps = {
  config: {
    id: string
    name: string
    description: string | null
    content: string | null
    repositoryUrl: string | null
    license: string | null
    status: ConfigStatus
    configThemes: Array<{
      themeId: string
      theme: {
        id: string
        name: string
      }
    }>
    configPlatforms: Array<{
      platformId: string
      platform: {
        id: string
        name: string
      }
    }>
    fonts: unknown
    screenshots: unknown
    pendingEdits: PendingEdit[]
  }
}

const getPendingDiff = (pendingEdit?: PendingEdit) => {
  if (!pendingEdit || typeof pendingEdit.diff !== "object" || pendingEdit.diff === null) {
    return {} as Partial<EditableConfigFields>
  }

  const diff = pendingEdit.diff as Partial<EditableConfigFields>

  return {
    ...diff,
    fonts: parseConfigFonts(diff.fonts),
    screenshots: parseConfigScreenshots(diff.screenshots),
  }
}

export const ConfigEditDialog = ({ config }: ConfigEditDialogProps) => {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const uploadPathRef = useRef(`configs/edits/${config.id}/${Date.now()}`)

  const pendingEdit = config.pendingEdits[0]
  const pendingDiff = getPendingDiff(pendingEdit)

  const initialValues = useMemo<EditableConfigFields>(
    () => ({
      name: pendingDiff.name ?? config.name,
      description: pendingDiff.description ?? config.description ?? "",
      content: pendingDiff.content ?? config.content ?? "",
      repositoryUrl: pendingDiff.repositoryUrl ?? config.repositoryUrl ?? "",
      license: pendingDiff.license ?? config.license ?? "",
      themeIds: pendingDiff.themeIds ?? config.configThemes.map(entry => entry.themeId),
      themeNames: pendingDiff.themeNames ?? config.configThemes.map(entry => entry.theme.name),
      platformIds: pendingDiff.platformIds ?? config.configPlatforms.map(entry => entry.platformId),
      platformNames:
        pendingDiff.platformNames ?? config.configPlatforms.map(entry => entry.platform.name),
      fonts: pendingDiff.fonts ?? parseConfigFonts(config.fonts),
      screenshots: pendingDiff.screenshots ?? parseConfigScreenshots(config.screenshots),
    }),
    [
      config.configPlatforms,
      config.configThemes,
      config.content,
      config.description,
      config.fonts,
      config.license,
      config.name,
      config.repositoryUrl,
      config.screenshots,
      pendingDiff.content,
      pendingDiff.description,
      pendingDiff.fonts,
      pendingDiff.license,
      pendingDiff.name,
      pendingDiff.platformIds,
      pendingDiff.platformNames,
      pendingDiff.repositoryUrl,
      pendingDiff.screenshots,
      pendingDiff.themeIds,
      pendingDiff.themeNames,
    ],
  )

  const [values, setValues] = useState<EditableConfigFields>(initialValues)

  const { execute, isPending } = useServerAction(submitConfigEdit, {
    onSuccess: () => {
      toast.success("Edit submitted for review.")
      setIsOpen(false)
      router.refresh()
    },
    onError: ({ err }) => {
      toast.error(err.message)
    },
  })

  const handleThemeSearch = useCallback(async (query: string) => {
    const [results, error] = await searchThemesAction({ query })
    if (error) return []
    return results ?? []
  }, [])

  const handlePlatformSearch = useCallback(async (query: string) => {
    const [results, error] = await searchPlatformsAction({ query })
    if (error) return []
    return results ?? []
  }, [])

  const canEdit = config.status !== ConfigStatus.Draft

  if (!canEdit) {
    return (
      <Button size="sm" variant="secondary" disabled>
        Under review
      </Button>
    )
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={open => {
        setIsOpen(open)
        if (open) {
          setValues(initialValues)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          {pendingEdit ? "Edit pending" : "Edit"}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Config</DialogTitle>
          <DialogDescription>
            Changes are submitted for admin review before they go live.
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4"
          onSubmit={event => {
            event.preventDefault()

            const normalizedFonts = values.fonts.filter(
              font => font.name.trim().length > 0 || font.url.trim().length > 0,
            )
            const normalizedScreenshots = values.screenshots
              .map(screenshot => screenshot.trim())
              .filter(Boolean)

            execute({
              configId: config.id,
              diff: {
                name: values.name,
                description: values.description,
                content: values.content,
                repositoryUrl: values.repositoryUrl,
                license: values.license,
                themeIds: values.themeIds,
                themeNames: values.themeNames,
                platformIds: values.platformIds,
                platformNames: values.platformNames,
                fonts: normalizedFonts,
                screenshots: normalizedScreenshots,
              },
            })
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor={`config-name-${config.id}`}>Config Name</Label>
            <Input
              id={`config-name-${config.id}`}
              value={values.name}
              onChange={event =>
                setValues(current => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Config name"
              required
            />
          </div>

          <EntityMultiSelect
            addLabel="Add another theme..."
            emptyLabel="Select one or more themes..."
            inputLabel="Themes"
            placeholder="Search themes..."
            searchEmptyText="No theme found."
            fallbackIcon="lucide/hash"
            selected={values.themeIds.map((id, index) => ({
              id,
              name: values.themeNames[index] ?? "Unknown theme",
            }))}
            onSearch={handleThemeSearch}
            onChange={entries =>
              setValues(current => ({
                ...current,
                themeIds: entries.map(entry => entry.id),
                themeNames: entries.map(entry => entry.name),
              }))
            }
          />

          <EntityMultiSelect
            addLabel="Add another platform..."
            emptyLabel="Select one or more platforms..."
            inputLabel="Platforms"
            placeholder="Search platforms..."
            searchEmptyText="No platform found."
            fallbackIcon="lucide/globe"
            selected={values.platformIds.map((id, index) => ({
              id,
              name: values.platformNames[index] ?? "Unknown platform",
            }))}
            onSearch={handlePlatformSearch}
            onChange={entries =>
              setValues(current => ({
                ...current,
                platformIds: entries.map(entry => entry.id),
                platformNames: entries.map(entry => entry.name),
              }))
            }
          />

          <div className="grid gap-2">
            <Label htmlFor={`config-description-${config.id}`}>Short Description</Label>
            <Input
              id={`config-description-${config.id}`}
              value={values.description}
              onChange={event =>
                setValues(current => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Short description"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`config-content-${config.id}`}>Details (Markdown)</Label>
            <TextArea
              id={`config-content-${config.id}`}
              value={values.content}
              onChange={event =>
                setValues(current => ({
                  ...current,
                  content: event.target.value,
                }))
              }
              rows={8}
              placeholder="Setup details, notes, links..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`config-repository-${config.id}`}>Repository URL</Label>
            <Input
              id={`config-repository-${config.id}`}
              type="url"
              value={values.repositoryUrl}
              onChange={event =>
                setValues(current => ({
                  ...current,
                  repositoryUrl: event.target.value,
                }))
              }
              placeholder="https://example.com/config"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`config-license-${config.id}`}>License</Label>
            <Input
              id={`config-license-${config.id}`}
              value={values.license}
              onChange={event =>
                setValues(current => ({
                  ...current,
                  license: event.target.value,
                }))
              }
              placeholder="MIT"
            />
          </div>

          <ConfigFontFields
            fonts={values.fonts}
            onChange={fonts => setValues(current => ({ ...current, fonts }))}
          />

          <ConfigScreenshotFields
            screenshots={values.screenshots}
            onChange={screenshots => setValues(current => ({ ...current, screenshots }))}
            uploadPath={uploadPathRef.current}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isPending={isPending}>
              Submit Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { formatDate } from "@primoui/utils"
import { EditStatus } from "@prisma/client"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { useServerAction } from "zsa-react"
import { Button } from "~/components/common/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/common/dialog"
import { Note } from "~/components/common/note"
import { TextArea } from "~/components/common/textarea"
import { parseConfigFonts, parseConfigScreenshots } from "~/lib/configs"
import { approveConfigEdit, rejectConfigEdit } from "~/server/admin/config-edits/actions"
import type { findConfigEdits } from "~/server/admin/config-edits/queries"

type ConfigEditRow = Awaited<ReturnType<typeof findConfigEdits>>["configEdits"][number]

type ConfigEditsTableProps = {
  configEdits: ConfigEditRow[]
}

type EditableField =
  | "name"
  | "description"
  | "content"
  | "repositoryUrl"
  | "license"
  | "themeIds"
  | "platformIds"
  | "fonts"
  | "screenshots"

const fieldLabels: Record<EditableField, string> = {
  name: "Name",
  description: "Description",
  content: "Content",
  repositoryUrl: "Repository URL",
  license: "License",
  themeIds: "Themes",
  platformIds: "Platforms",
  fonts: "Fonts",
  screenshots: "Screenshots",
}

const isEditableField = (value: string): value is EditableField => value in fieldLabels

const normalizeFieldValue = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === "string") {
    return value
  }

  if (Array.isArray(value)) {
    return JSON.stringify(value, null, 2)
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const getDiffRecord = (diff: unknown): Partial<Record<EditableField, string | null>> => {
  if (typeof diff !== "object" || diff === null) {
    return {}
  }

  const record: Partial<Record<EditableField, string | null>> = {}

  for (const [key, value] of Object.entries(diff)) {
    if (isEditableField(key)) {
      record[key] = normalizeFieldValue(value)
    }
  }

  return record
}

const getChangedFields = (diff: unknown) =>
  Object.keys(getDiffRecord(diff)).filter(isEditableField).sort()

const getConfigFieldValue = (
  config: ConfigEditRow["config"] | null | undefined,
  field: EditableField,
): string | null => {
  if (!config) {
    return null
  }

  switch (field) {
    case "name":
      return config.name
    case "description":
      return config.description
    case "content":
      return config.content
    case "repositoryUrl":
      return config.repositoryUrl
    case "license":
      return config.license
    case "themeIds":
      return config.configThemes.map(entry => entry.theme.name).join(", ")
    case "platformIds":
      return config.configPlatforms.map(entry => entry.platform.name).join(", ")
    case "fonts":
      return normalizeFieldValue(parseConfigFonts(config.fonts))
    case "screenshots":
      return normalizeFieldValue(parseConfigScreenshots(config.screenshots))
  }
}

const DiffValue = ({ value }: { value: string | null | undefined }) => {
  const normalized = value?.trim() ?? ""
  const display = normalized.length > 0 ? normalized : "(empty)"
  const isLong = display.includes("\n") || display.length > 120

  if (isLong) {
    return (
      <pre className="max-h-60 overflow-auto rounded-md border bg-muted/30 p-2 text-xs whitespace-pre-wrap break-words">
        {display}
      </pre>
    )
  }

  return <p className="rounded-md border bg-muted/30 p-2 text-sm break-words">{display}</p>
}

export const ConfigEditsTable = ({ configEdits }: ConfigEditsTableProps) => {
  const router = useRouter()
  const [previewingId, setPreviewingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const previewingEdit = useMemo(
    () => configEdits.find(edit => edit.id === previewingId) ?? null,
    [configEdits, previewingId],
  )
  const previewDiff = useMemo(() => getDiffRecord(previewingEdit?.diff), [previewingEdit?.diff])
  const previewFields = useMemo(
    () => Object.keys(previewDiff).filter(isEditableField).sort(),
    [previewDiff],
  )

  const approveAction = useServerAction(approveConfigEdit, {
    onSuccess: () => {
      toast.success("Config edit approved and published.")
      setPreviewingId(null)
      router.refresh()
    },
    onError: ({ err }) => {
      toast.error(err.message)
    },
  })

  const rejectAction = useServerAction(rejectConfigEdit, {
    onSuccess: () => {
      toast.success("Config edit rejected.")
      setRejectingId(null)
      setRejectReason("")
      router.refresh()
    },
    onError: ({ err }) => {
      toast.error(err.message)
    },
  })

  const pendingCount = useMemo(
    () => configEdits.filter(edit => edit.status === EditStatus.Pending).length,
    [configEdits],
  )

  if (configEdits.length === 0) {
    return <Note>No config edits found.</Note>
  }

  return (
    <div className="grid gap-3">
      <Note>{pendingCount} pending review</Note>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Config</th>
              <th className="px-4 py-3 text-left font-medium">Editor</th>
              <th className="px-4 py-3 text-left font-medium">Changed fields</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Created</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>

          <tbody>
            {configEdits.map(configEdit => {
              const changedFields = getChangedFields(configEdit.diff)
              const isPending = configEdit.status === EditStatus.Pending

              return (
                <tr key={configEdit.id} className="border-t align-top">
                  <td className="px-4 py-3">{configEdit.config?.name ?? "Unknown"}</td>
                  <td className="px-4 py-3">{configEdit.editor?.name ?? "Unknown"}</td>
                  <td className="px-4 py-3">
                    {changedFields.length > 0 ? changedFields.join(", ") : "-"}
                  </td>
                  <td className="px-4 py-3">{configEdit.status}</td>
                  <td className="px-4 py-3">{formatDate(configEdit.createdAt)}</td>
                  <td className="px-4 py-3">
                    {isPending ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setPreviewingId(configEdit.id)}
                        >
                          Review diff
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setRejectingId(configEdit.id)
                            setRejectReason("")
                          }}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <div className="text-right text-muted-foreground">Reviewed</div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Dialog
        open={Boolean(previewingEdit)}
        onOpenChange={open => {
          if (!open) {
            setPreviewingId(null)
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review config edit diff</DialogTitle>
            <DialogDescription>
              Compare current values with proposed changes before approving.
            </DialogDescription>
          </DialogHeader>

          {previewingEdit ? (
            <div className="grid gap-4">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {previewingEdit.config?.name ?? "Unknown"}
                </span>{" "}
                edited by{" "}
                <span className="font-medium text-foreground">
                  {previewingEdit.editor?.name ?? "Unknown"}
                </span>{" "}
                on {formatDate(previewingEdit.createdAt)}
              </div>

              {previewFields.length > 0 ? (
                previewFields.map(field => (
                  <div key={field} className="grid gap-3 rounded-md border p-4">
                    <h4 className="text-sm font-semibold">{fieldLabels[field]}</h4>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="grid gap-1.5">
                        <span className="text-xs font-medium text-muted-foreground">Current</span>
                        <DiffValue value={getConfigFieldValue(previewingEdit.config, field)} />
                      </div>

                      <div className="grid gap-1.5">
                        <span className="text-xs font-medium text-muted-foreground">Proposed</span>
                        <DiffValue value={previewDiff[field]} />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <Note>No valid changed fields found in this edit diff.</Note>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setPreviewingId(null)}>
              Close
            </Button>
            <Button
              type="button"
              onClick={() =>
                previewingEdit && approveAction.execute({ configEditId: previewingEdit.id })
              }
              isPending={approveAction.isPending}
            >
              Approve and Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(rejectingId)}
        onOpenChange={open => {
          if (!open) {
            setRejectingId(null)
            setRejectReason("")
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Reject config edit</DialogTitle>
            <DialogDescription>
              Add a short reason so the editor knows what needs to change.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <TextArea
              value={rejectReason}
              onChange={event => setRejectReason(event.target.value)}
              rows={5}
              placeholder="Explain why this edit cannot be approved yet."
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setRejectingId(null)
                setRejectReason("")
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() =>
                rejectingId &&
                rejectAction.execute({
                  configEditId: rejectingId,
                  reason: rejectReason,
                })
              }
              isPending={rejectAction.isPending}
            >
              Reject edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

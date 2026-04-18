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
import { approvePortEdit, rejectPortEdit } from "~/server/admin/port-edits/actions"
import type { findPortEdits } from "~/server/admin/port-edits/queries"

type PortEditRow = Awaited<ReturnType<typeof findPortEdits>>["portEdits"][number]

type PortEditsTableProps = {
  portEdits: PortEditRow[]
}

type EditableField = "name" | "description" | "content" | "repositoryUrl" | "license"

const fieldLabels: Record<EditableField, string> = {
  name: "Name",
  description: "Description",
  content: "Content",
  repositoryUrl: "Port URL",
  license: "License",
}

const isEditableField = (value: string): value is EditableField => value in fieldLabels

const normalizeFieldValue = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === "string") {
    return value
  }

  try {
    return JSON.stringify(value)
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

const getPortFieldValue = (
  port: PortEditRow["port"] | null | undefined,
  field: EditableField,
): string | null => {
  if (!port) {
    return null
  }

  switch (field) {
    case "name":
      return port.name
    case "description":
      return port.description
    case "content":
      return port.content
    case "repositoryUrl":
      return port.repositoryUrl
    case "license":
      return port.license
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

export const PortEditsTable = ({ portEdits }: PortEditsTableProps) => {
  const router = useRouter()
  const [previewingId, setPreviewingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const previewingEdit = useMemo(
    () => portEdits.find(edit => edit.id === previewingId) ?? null,
    [portEdits, previewingId],
  )
  const previewDiff = useMemo(() => getDiffRecord(previewingEdit?.diff), [previewingEdit?.diff])
  const previewFields = useMemo(
    () => Object.keys(previewDiff).filter(isEditableField).sort(),
    [previewDiff],
  )

  const approveAction = useServerAction(approvePortEdit, {
    onSuccess: () => {
      toast.success("Port edit approved and published.")
      setPreviewingId(null)
      router.refresh()
    },
    onError: ({ err }) => {
      toast.error(err.message)
    },
  })

  const rejectAction = useServerAction(rejectPortEdit, {
    onSuccess: () => {
      toast.success("Port edit rejected.")
      setRejectingId(null)
      setRejectReason("")
      router.refresh()
    },
    onError: ({ err }) => {
      toast.error(err.message)
    },
  })

  const pendingCount = useMemo(
    () => portEdits.filter(edit => edit.status === EditStatus.Pending).length,
    [portEdits],
  )

  if (portEdits.length === 0) {
    return <Note>No port edits found.</Note>
  }

  return (
    <div className="grid gap-3">
      <Note>{pendingCount} pending review</Note>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Port</th>
              <th className="px-4 py-3 text-left font-medium">Editor</th>
              <th className="px-4 py-3 text-left font-medium">Changed fields</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Created</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>

          <tbody>
            {portEdits.map(portEdit => {
              const changedFields = getChangedFields(portEdit.diff)
              const isPending = portEdit.status === EditStatus.Pending

              return (
                <tr key={portEdit.id} className="border-t align-top">
                  <td className="px-4 py-3">{portEdit.port?.name ?? "Unknown"}</td>
                  <td className="px-4 py-3">{portEdit.editor?.name ?? "Unknown"}</td>
                  <td className="px-4 py-3">
                    {changedFields.length > 0 ? changedFields.join(", ") : "-"}
                  </td>
                  <td className="px-4 py-3">{portEdit.status}</td>
                  <td className="px-4 py-3">{formatDate(portEdit.createdAt)}</td>
                  <td className="px-4 py-3">
                    {isPending ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setPreviewingId(portEdit.id)}
                        >
                          Review diff
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setRejectingId(portEdit.id)
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
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review port edit diff</DialogTitle>
            <DialogDescription>
              Compare current values with proposed changes before approving.
            </DialogDescription>
          </DialogHeader>

          {previewingEdit ? (
            <div className="grid gap-4">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {previewingEdit.port?.name ?? "Unknown"}
                </span>{" "}
                edited by{" "}
                <span className="font-medium text-foreground">
                  {previewingEdit.editor?.name ?? "Unknown"}
                </span>{" "}
                on {formatDate(previewingEdit.createdAt)}
              </div>

              {previewFields.length > 0 ? (
                previewFields.map(field => (
                  <div key={field} className="rounded-md border p-4 grid gap-3">
                    <h4 className="text-sm font-semibold">{fieldLabels[field]}</h4>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="grid gap-1.5">
                        <span className="text-xs font-medium text-muted-foreground">Current</span>
                        <DiffValue value={getPortFieldValue(previewingEdit.port, field)} />
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
              variant="primary"
              isPending={approveAction.isPending}
              disabled={!previewingEdit || previewFields.length === 0}
              onClick={() => {
                if (!previewingEdit) {
                  return
                }

                approveAction.execute({ id: previewingEdit.id })
              }}
            >
              Approve and publish
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject port edit?</DialogTitle>
            <DialogDescription>
              Add an optional note so the editor knows what to fix.
            </DialogDescription>
          </DialogHeader>

          <TextArea
            value={rejectReason}
            onChange={event => setRejectReason(event.target.value)}
            placeholder="Optional rejection reason"
            rows={4}
          />

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
              isPending={rejectAction.isPending}
              onClick={() => {
                if (!rejectingId) {
                  return
                }

                rejectAction.execute({
                  id: rejectingId,
                  adminNote: rejectReason.trim() || undefined,
                })
              }}
            >
              Confirm reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

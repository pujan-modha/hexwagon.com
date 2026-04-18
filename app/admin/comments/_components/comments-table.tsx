"use client"

import { formatDate } from "@primoui/utils"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { useServerAction } from "zsa-react"
import { Button } from "~/components/common/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/common/dialog"
import { deleteComment } from "~/server/admin/comments/actions"
import type { findComments } from "~/server/admin/comments/queries"

type CommentRow = Awaited<ReturnType<typeof findComments>>["comments"][number]

type CommentsTableProps = {
  comments: CommentRow[]
}

export const CommentsTable = ({ comments }: CommentsTableProps) => {
  const router = useRouter()
  const [selectedComment, setSelectedComment] = useState<CommentRow | null>(null)

  const { execute, isPending } = useServerAction(deleteComment, {
    onSuccess: () => {
      toast.success("Comment deleted")
      setSelectedComment(null)
      router.refresh()
    },
    onError: ({ err }) => {
      toast.error(err.message)
    },
  })

  return (
    <>
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Port</th>
              <th className="px-4 py-3 text-left font-medium">Author Email</th>
              <th className="px-4 py-3 text-left font-medium">Content</th>
              <th className="px-4 py-3 text-left font-medium">Created</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>

          <tbody>
            {comments.map(comment => (
              <tr key={comment.id} className="border-t align-top">
                <td className="px-4 py-3">{comment.port?.name ?? "Unknown"}</td>

                <td className="px-4 py-3">
                  <div className="grid gap-1">
                    <span>{comment.author?.email ?? "Anonymous"}</span>
                    {comment.author?.name && (
                      <span className="text-xs text-muted-foreground">{comment.author.name}</span>
                    )}
                  </div>
                </td>

                <td className="px-4 py-3 max-w-xl whitespace-pre-wrap break-words">
                  {comment.content}
                </td>

                <td className="px-4 py-3 whitespace-nowrap">{formatDate(comment.createdAt)}</td>

                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setSelectedComment(comment)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={Boolean(selectedComment)}
        onOpenChange={open => {
          if (!open) {
            setSelectedComment(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete comment?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The selected comment will be permanently removed.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <DialogClose asChild>
              <Button size="md" variant="secondary">
                Cancel
              </Button>
            </DialogClose>

            <Button
              size="md"
              variant="destructive"
              isPending={isPending}
              onClick={() => {
                if (!selectedComment) {
                  return
                }

                execute({ id: selectedComment.id })
              }}
            >
              Delete comment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

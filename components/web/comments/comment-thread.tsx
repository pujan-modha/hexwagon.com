"use client"

import { formatDistanceToNow } from "date-fns"
import type { ComponentProps } from "react"
import { useState } from "react"
import { deleteComment } from "~/actions/comment"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/common/avatar"
import { Button } from "~/components/common/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/common/dialog"
import { Icon } from "~/components/common/icon"
import { useAuth } from "~/lib/auth-client"
import { cn } from "~/utils/cva"

type Comment = {
  id: string
  content: string
  createdAt: Date
  author: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
  replies?: Comment[]
}

type CommentThreadProps = {
  comments: Comment[]
  portId: string
  onReply?: (parentId: string) => void
} & ComponentProps<"div">

const CommentItem = ({
  comment,
  portId,
  onReply,
  isReply = false,
}: {
  comment: Comment
  portId: string
  onReply?: (parentId: string) => void
  isReply?: boolean
}) => {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const { user } = useAuth()
  const isAuthor = user?.id === comment.author.id
  const displayName = comment.author.email.split("@")[0] || "Anonymous"
  const avatarFallback = displayName[0]?.toUpperCase() ?? "?"

  const handleDelete = async () => {
    await deleteComment({ id: comment.id })
    setIsDeleteOpen(false)
  }

  return (
    <>
      <div className={cn("flex gap-3", isReply && "ml-8 mt-3")}>
        <Avatar className="size-8">
          <AvatarImage src={comment.author.image ?? undefined} alt={displayName} />
          <AvatarFallback>{avatarFallback}</AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{displayName}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), {
                addSuffix: true,
              })}
            </span>

            {isAuthor && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-destructive"
                onClick={() => setIsDeleteOpen(true)}
                aria-label="Delete comment"
                title="Delete comment"
              >
                <Icon name="lucide/trash" />
              </Button>
            )}
          </div>

          <p className="mt-1 text-sm">{comment.content}</p>

          <div className="mt-2 flex gap-2">
            {onReply && !isReply && (
              <Button variant="ghost" size="sm" onClick={() => onReply(comment.id)}>
                Reply
              </Button>
            )}
          </div>

          {comment.replies?.map(reply => (
            <CommentItem key={reply.id} comment={reply} portId={portId} onReply={onReply} isReply />
          ))}
        </div>
      </div>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete comment?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

const CommentThread = ({ comments, portId, onReply, ...props }: CommentThreadProps) => {
  if (!comments.length) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No comments yet. Be the first to comment!
      </p>
    )
  }

  return (
    <div className={cn("flex flex-col gap-4", props.className)} {...props}>
      {comments.map(comment => (
        <CommentItem key={comment.id} comment={comment} portId={portId} onReply={onReply} />
      ))}
    </div>
  )
}

export { CommentThread }

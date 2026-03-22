import type { ComponentProps } from "react"
import { Card } from "~/components/common/card"
import { Avatar, AvatarFallback } from "~/components/common/avatar"
import { Button } from "~/components/common/button"
import { Icon } from "~/components/common/icon"
import { Link } from "~/components/common/link"
import { useAuth } from "~/lib/auth-client"
import { formatDistanceToNow } from "date-fns"
import { deleteComment } from "~/actions/comment"
import { cn } from "~/utils/cva"

type Comment = {
  id: string
  content: string
  createdAt: Date
  author: { id: string; name: string | null; image: string | null }
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
  const { user } = useAuth()
  const isAuthor = user?.id === comment.author.id

  const handleDelete = async () => {
    if (confirm("Delete this comment?")) {
      await deleteComment({ id: comment.id })
    }
  }

  return (
    <div className={cn("flex gap-3", isReply && "ml-8 mt-3")}>
      <Avatar className="size-8">
        <AvatarFallback>{comment.author.name?.[0] ?? "?"}</AvatarFallback>
      </Avatar>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{comment.author.name ?? "Anonymous"}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </span>
        </div>

        <p className="mt-1 text-sm">{comment.content}</p>

        <div className="mt-2 flex gap-2">
          {onReply && !isReply && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReply(comment.id)}
            >
              Reply
            </Button>
          )}
          {isAuthor && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
            >
              Delete
            </Button>
          )}
        </div>

        {comment.replies?.map(reply => (
          <CommentItem
            key={reply.id}
            comment={reply}
            portId={portId}
            onReply={onReply}
            isReply
          />
        ))}
      </div>
    </div>
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
        <CommentItem
          key={comment.id}
          comment={comment}
          portId={portId}
          onReply={onReply}
        />
      ))}
    </div>
  )
}

export { CommentThread }

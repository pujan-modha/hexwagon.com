"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useServerAction } from "zsa-react"
import { getLikeStatus, toggleLike } from "~/actions/like"
import { Button } from "~/components/common/button"
import { LoginDialog } from "~/components/web/auth/login-dialog"
import { useSession } from "~/lib/auth-client"
import { cx } from "~/utils/cva"

type EntityType = "theme" | "platform" | "port" | "config"

type EntityLikeButtonProps = {
  entityType: EntityType
  entityId: string
  grouped?: boolean
}

const HeartIcon = ({ liked }: { liked: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={cx("size-[1.1em] transition-colors", liked ? "fill-current" : "fill-none")}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m12 21-1.45-1.32C5.4 15.02 2 11.94 2 8.15 2 5.06 4.42 2.65 7.5 2.65c1.74 0 3.41.81 4.5 2.09 1.09-1.28 2.76-2.09 4.5-2.09 3.08 0 5.5 2.41 5.5 5.5 0 3.79-3.4 6.87-8.55 11.53z" />
  </svg>
)

export const EntityLikeButton = ({
  entityType,
  entityId,
  grouped = false,
}: EntityLikeButtonProps) => {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [isLiked, setIsLiked] = useState(false)

  const statusAction = useServerAction(getLikeStatus, {
    onSuccess: ({ data }) => {
      setIsLiked(Boolean(data?.liked))
    },
    onError: () => setIsLiked(false),
  })

  const toggleAction = useServerAction(toggleLike, {
    onSuccess: ({ data }) => {
      const liked = Boolean(data?.liked)
      setIsLiked(liked)
      toast.success(liked ? "Added to your likes." : "Removed from your likes.")
    },
    onError: ({ err }) => toast.error(err.message),
  })

  useEffect(() => {
    if (!session?.user?.id) {
      setIsLiked(false)
      return
    }

    statusAction.execute({ entityType, entityId })
  }, [entityId, entityType, session?.user?.id, statusAction.execute])

  if (!session?.user) {
    return (
      <>
        <Button
          type="button"
          size="sm"
          variant={grouped ? "ghost" : "secondary"}
          onClick={() => setIsOpen(true)}
          className={cx(
            grouped
              ? "h-8 w-10 rounded-none px-0 text-muted-foreground hover:bg-muted/30 [&>span]:flex [&>span]:items-center [&>span]:justify-center"
              : "px-2.5 text-muted-foreground",
          )}
          aria-label="Like"
          title="Like"
        >
          <HeartIcon liked={false} />
        </Button>

        <LoginDialog
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          description="Sign in to save ports, themes, platforms, and configs to your likes."
        />
      </>
    )
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={grouped ? "ghost" : "secondary"}
      onClick={() => toggleAction.execute({ entityType, entityId })}
      isPending={toggleAction.isPending}
      className={cx(
        grouped
          ? "h-8 w-10 rounded-none px-0 hover:bg-muted/30 [&>span]:flex [&>span]:items-center [&>span]:justify-center"
          : "px-2.5",
        isLiked
          ? "text-rose-500 hover:text-rose-500"
          : "text-muted-foreground hover:text-foreground",
      )}
      aria-label={isLiked ? "Unlike" : "Like"}
      title={isLiked ? "Liked" : "Like"}
    >
      <HeartIcon liked={isLiked} />
    </Button>
  )
}

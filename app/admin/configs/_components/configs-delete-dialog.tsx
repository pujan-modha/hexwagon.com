"use client"

import type { ComponentProps } from "react"
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
  DialogTrigger,
} from "~/components/common/dialog"
import { Icon } from "~/components/common/icon"
import { deleteConfigs } from "~/server/admin/configs/actions"

type ConfigsDeleteDialogProps = ComponentProps<typeof Dialog> & {
  tools: { id: string }[]
  showTrigger?: boolean
  onSuccess?: () => void
}

export const ConfigsDeleteDialog = ({
  tools,
  showTrigger = true,
  onSuccess,
  ...props
}: ConfigsDeleteDialogProps) => {
  const { execute, isPending } = useServerAction(deleteConfigs, {
    onSuccess: () => {
      props.onOpenChange?.(false)
      toast.success("Configs deleted")
      onSuccess?.()
    },
    onError: ({ err }) => toast.error(err.message),
  })

  return (
    <Dialog {...props}>
      {showTrigger ? (
        <DialogTrigger asChild>
          <Button variant="secondary" size="md" prefix={<Icon name="lucide/trash" />}>
            Delete ({tools.length})
          </Button>
        </DialogTrigger>
      ) : null}

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you absolutely sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete your{" "}
            <span className="font-medium">{tools.length}</span>
            {tools.length === 1 ? " config" : " configs"} from our servers.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose asChild>
            <Button size="md" variant="secondary">
              Cancel
            </Button>
          </DialogClose>

          <Button
            aria-label="Delete selected rows"
            size="md"
            variant="destructive"
            className="min-w-28"
            onClick={() => execute({ ids: tools.map(({ id }) => id) })}
            isPending={isPending}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

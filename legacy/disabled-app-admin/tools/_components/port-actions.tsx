"use client"

import { isValidUrl } from "@primoui/utils"
import type { Port } from "@prisma/client"
import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation"
import { type ComponentProps, useState } from "react"
import { toast } from "sonner"
import { useServerAction } from "zsa-react"
import { PortsDeleteDialog } from "~/app/admin/tools/_components/ports-delete-dialog"
import { Button } from "~/components/common/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/common/dropdown-menu"
import { Icon } from "~/components/common/icon"
import { Link } from "~/components/common/link"
import { fetchPortRepositoryData } from "~/server/admin/ports/actions"
import { cx } from "~/utils/cva"

type PortActionsProps = ComponentProps<typeof Button> & {
  port: Port
}

export const PortActions = ({ className, port, ...props }: PortActionsProps) => {
  const pathname = usePathname()
  const router = useRouter()
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const actions = [
    {
      action: fetchPortRepositoryData,
      label: "Fetch Repository Data",
      successMessage: "Repository data fetched successfully",
    },
  ] as const

  const portActions = actions.map(({ label, action, successMessage }) => ({
    label,
    execute: useServerAction(action, {
      onSuccess: () => toast.success(successMessage),
      onError: ({ err }) => toast.error(err.message),
    }).execute,
  }))

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Open menu"
          variant="secondary"
          size="sm"
          prefix={<Icon name="lucide/ellipsis" />}
          className={cx("data-[state=open]:bg-accent", className)}
          {...props}
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        {pathname !== `/admin/ports/${port.slug}` && (
          <DropdownMenuItem asChild>
            <Link href={`/admin/ports/${port.slug}`}>Edit</Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem asChild>
          <Link href={`/${port.slug}`} target="_blank">
            View
          </Link>
        </DropdownMenuItem>

        {portActions.map(({ label, execute }) => (
          <DropdownMenuItem key={label} onSelect={() => execute({ id: port.id })}>
            {label}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        {isValidUrl(port.websiteUrl) && (
          <DropdownMenuItem asChild>
            <Link href={port.websiteUrl} target="_blank">
              Visit website
            </Link>
          </DropdownMenuItem>
        )}

        {isValidUrl(port.repositoryUrl) && (
          <DropdownMenuItem asChild>
            <Link href={port.repositoryUrl} target="_blank">
              Visit repository
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={() => setIsDeleteOpen(true)} className="text-red-500">
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>

      <PortsDeleteDialog
        open={isDeleteOpen}
        onOpenChange={() => setIsDeleteOpen(false)}
        ports={[port]}
        showTrigger={false}
        onSuccess={() => router.push("/admin/ports")}
      />
    </DropdownMenu>
  )
}
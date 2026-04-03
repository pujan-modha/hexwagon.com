"use client"

import { isValidUrl } from "@primoui/utils"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { useServerAction } from "zsa-react"
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
import { setOfficialPort } from "~/server/admin/ports/actions"
import { cx } from "~/utils/cva"
import { PortsDeleteDialog } from "./ports-delete-dialog"

type PortActionsProps = {
  port: {
    id: string
    slug: string
    repositoryUrl: string | null
    isOfficial: boolean
    theme?: { slug: string; name: string }
    platform?: { slug: string; name: string }
  }
  className?: string
}

export const PortActions = ({ className, port }: PortActionsProps) => {
  const pathname = usePathname()
  const router = useRouter()
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const { execute: makeOfficial, isPending: isOfficialPending } = useServerAction(setOfficialPort, {
    onSuccess: () => toast.success("Port marked as official"),
    onError: ({ err }) => toast.error(err.message),
  })

  const publicUrl =
    port.theme && port.platform
      ? `/themes/${port.theme.slug}/${port.platform.slug}/${port.id}`
      : "/"
  const repositoryUrl = port.repositoryUrl ?? ""

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Open menu"
          variant="secondary"
          size="sm"
          prefix={<Icon name="lucide/ellipsis" />}
          className={cx("data-[state=open]:bg-accent", className)}
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        {pathname !== `/admin/ports/${port.slug}` && (
          <DropdownMenuItem asChild>
            <Link href={`/admin/ports/${port.slug}`}>Edit</Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem asChild>
          <Link href={publicUrl} target="_blank">
            View
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={() => makeOfficial({ portId: port.id })}
          disabled={port.isOfficial || isOfficialPending}
        >
          {port.isOfficial ? "Official Port" : "Make Official"}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {isValidUrl(repositoryUrl) && (
          <DropdownMenuItem asChild>
            <Link href={repositoryUrl} target="_blank">
              Open port link
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
        tools={[port]}
        showTrigger={false}
        onSuccess={() => router.push("/admin/ports")}
      />
    </DropdownMenu>
  )
}

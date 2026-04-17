"use client"

import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
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
import { cx } from "~/utils/cva"
import { ConfigsDeleteDialog } from "./configs-delete-dialog"

type ConfigActionsProps = {
  config: {
    id: string
    slug: string
  }
  className?: string
}

export const ConfigActions = ({ className, config }: ConfigActionsProps) => {
  const pathname = usePathname()
  const router = useRouter()
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

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
        {pathname !== `/admin/configs/${config.slug}` ? (
          <DropdownMenuItem asChild>
            <Link href={`/admin/configs/${config.slug}`}>Edit</Link>
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuItem asChild>
          <Link href={`/configs/${config.slug}`} target="_blank">
            View
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={() => setIsDeleteOpen(true)} className="text-red-500">
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>

      <ConfigsDeleteDialog
        open={isDeleteOpen}
        onOpenChange={() => setIsDeleteOpen(false)}
        tools={[config]}
        showTrigger={false}
        onSuccess={() => router.push("/admin/configs")}
      />
    </DropdownMenu>
  )
}

"use client"

import { formatDate } from "@primoui/utils"
import type { Config, Platform, Port, Report, Theme, User } from "@prisma/client"
import type { ColumnDef } from "@tanstack/react-table"
import { ReportActions } from "~/app/admin/reports/_components/report-actions"
import { RowCheckbox } from "~/components/admin/row-checkbox"
import { Badge } from "~/components/common/badge"
import { Note } from "~/components/common/note"
import { DataTableColumnHeader } from "~/components/data-table/data-table-column-header"
import { DataTableLink } from "~/components/data-table/data-table-link"

export const getColumns = (): ColumnDef<Report>[] => {
  return [
    {
      id: "select",
      enableSorting: false,
      enableHiding: false,
      header: ({ table }) => (
        <RowCheckbox
          checked={table.getIsAllPageRowsSelected()}
          ref={input => {
            if (input) {
              input.indeterminate =
                table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()
            }
          }}
          onChange={e => table.toggleAllPageRowsSelected(e.target.checked)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <RowCheckbox
          checked={row.getIsSelected()}
          onChange={e => row.toggleSelected(e.target.checked)}
          aria-label="Select row"
        />
      ),
    },
    {
      accessorKey: "id",
      enableSorting: false,
      enableHiding: false,
      size: 160,
      header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
      cell: ({ row }) => (
        <DataTableLink
          href={`/admin/reports/${row.original.id}`}
          title={`#${row.original.id.slice(-6).toUpperCase()}`}
        />
      ),
    },
    {
      accessorKey: "message",
      enableSorting: false,
      size: 320,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Message" />,
      cell: ({ row }) => <Note className="truncate">{row.getValue("message")}</Note>,
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Reported At" />,
      cell: ({ row }) => <Note>{formatDate(row.getValue<Date>("createdAt"))}</Note>,
    },
    {
      accessorKey: "type",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => <Badge variant="outline">{row.getValue("type")}</Badge>,
    },
    {
      accessorKey: "user",
      header: ({ column }) => <DataTableColumnHeader column={column} title="User" />,
      cell: ({ row }) => {
        const user = row.getValue<Pick<User, "id" | "name">>("user")

        return (
          <DataTableLink href={`/admin/users/${user?.id}`} title={user?.name} isOverlay={false} />
        )
      },
    },
    {
      id: "target",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Target" />,
      cell: ({ row }) => {
        const report = row.original as Report & {
          port?: Pick<Port, "slug" | "name"> | null
          theme?: Pick<Theme, "slug" | "name"> | null
          platform?: Pick<Platform, "slug" | "name"> | null
          config?: Pick<Config, "slug" | "name"> | null
        }

        const target = report.port
          ? {
              href: `/admin/ports/${report.port.slug}`,
              title: report.port.name ?? report.port.slug,
            }
          : report.theme
            ? {
                href: `/admin/themes/${report.theme.slug}`,
                title: report.theme.name ?? report.theme.slug,
              }
            : report.platform
              ? {
                  href: `/admin/platforms/${report.platform.slug}`,
                  title: report.platform.name ?? report.platform.slug,
                }
              : report.config
                ? {
                    href: `/admin/configs/${report.config.slug}`,
                    title: report.config.name ?? report.config.slug,
                  }
                : null

        return target ? (
          <DataTableLink href={target.href} title={target.title} isOverlay={false} />
        ) : (
          <Note>Site feedback</Note>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => <ReportActions report={row.original} className="float-right" />,
    },
  ]
}

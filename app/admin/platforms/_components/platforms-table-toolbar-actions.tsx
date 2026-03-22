"use client"

import type { Platform } from "@prisma/client"
import type { Table } from "@tanstack/react-table"
import { PlatformsDeleteDialog } from "./platforms-delete-dialog"

type PlatformsTableToolbarActionsProps = {
  table: Table<Platform>
}

export function PlatformsTableToolbarActions({ table }: PlatformsTableToolbarActionsProps) {
  const selectedPlatforms = table.getFilteredSelectedRowModel().rows.map(row => row.original)

  return selectedPlatforms.length > 0 ? (
    <PlatformsDeleteDialog tools={selectedPlatforms} onSuccess={() => table.toggleAllRowsSelected(false)} />
  ) : null
}

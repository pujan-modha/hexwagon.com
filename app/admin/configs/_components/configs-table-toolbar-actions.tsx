"use client"

import type { Table } from "@tanstack/react-table"
import { ConfigsDeleteDialog } from "./configs-delete-dialog"

type ConfigsTableToolbarActionsProps = {
  table: Table<any>
}

export function ConfigsTableToolbarActions({ table }: ConfigsTableToolbarActionsProps) {
  const selectedConfigs = table.getFilteredSelectedRowModel().rows.map(row => row.original)

  return selectedConfigs.length > 0 ? (
    <ConfigsDeleteDialog
      tools={selectedConfigs}
      onSuccess={() => table.toggleAllRowsSelected(false)}
    />
  ) : null
}

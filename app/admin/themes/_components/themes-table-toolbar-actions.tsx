"use client"

import type { Theme } from "@prisma/client"
import type { Table } from "@tanstack/react-table"
import { ThemesDeleteDialog } from "./themes-delete-dialog"

type ThemesTableToolbarActionsProps = {
  table: Table<Theme>
}

export function ThemesTableToolbarActions({ table }: ThemesTableToolbarActionsProps) {
  const selectedThemes = table.getFilteredSelectedRowModel().rows.map(row => row.original)

  return selectedThemes.length > 0 ? (
    <ThemesDeleteDialog tools={selectedThemes} onSuccess={() => table.toggleAllRowsSelected(false)} />
  ) : null
}

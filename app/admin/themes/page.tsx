import type { SearchParams } from "nuqs/server"
import { Suspense } from "react"
import { withAdminPage } from "~/components/admin/auth-hoc"
import { DataTableSkeleton } from "~/components/data-table/data-table-skeleton"
import { findThemes } from "~/server/admin/themes/queries"
import { themesTableParamsCache } from "~/server/admin/themes/schema"
import { ThemesTable } from "./_components/themes-table"

type ThemesPageProps = {
  searchParams: Promise<SearchParams>
}

const ThemesPage = async ({ searchParams }: ThemesPageProps) => {
  const search = themesTableParamsCache.parse(await searchParams)
  const themesPromise = findThemes(search)

  return (
    <Suspense fallback={<DataTableSkeleton title="Themes" />}>
      <ThemesTable themesPromise={themesPromise} />
    </Suspense>
  )
}

export default withAdminPage(ThemesPage)

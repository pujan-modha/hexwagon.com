import type { SearchParams } from "nuqs/server"
import { withAdminPage } from "~/components/admin/auth-hoc"
import { H3 } from "~/components/common/heading"
import { Note } from "~/components/common/note"
import { findConfigEdits } from "~/server/admin/config-edits/queries"
import { configEditsTableParamsCache } from "~/server/admin/config-edits/schema"
import { ConfigEditsTable } from "./_components/config-edits-table"

type ConfigEditsPageProps = {
  searchParams: Promise<SearchParams>
}

const ConfigEditsPage = async ({ searchParams }: ConfigEditsPageProps) => {
  const search = configEditsTableParamsCache.parse(await searchParams)
  const { configEdits, configEditsTotal, pageCount } = await findConfigEdits(search)

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <H3>Config Edits</H3>
        <Note>
          {configEditsTotal} edit{configEditsTotal === 1 ? "" : "s"} across {pageCount} page
          {pageCount === 1 ? "" : "s"}
        </Note>
      </div>

      <ConfigEditsTable configEdits={configEdits} />
    </div>
  )
}

export default withAdminPage(ConfigEditsPage)

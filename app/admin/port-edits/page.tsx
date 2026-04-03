import type { SearchParams } from "nuqs/server"
import { withAdminPage } from "~/components/admin/auth-hoc"
import { H3 } from "~/components/common/heading"
import { Note } from "~/components/common/note"
import { findPortEdits } from "~/server/admin/port-edits/queries"
import { portEditsTableParamsCache } from "~/server/admin/port-edits/schema"
import { PortEditsTable } from "./_components/port-edits-table"

type PortEditsPageProps = {
  searchParams: Promise<SearchParams>
}

const PortEditsPage = async ({ searchParams }: PortEditsPageProps) => {
  const search = portEditsTableParamsCache.parse(await searchParams)
  const { portEdits, portEditsTotal, pageCount } = await findPortEdits(search)

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <H3>Port Edits</H3>
        <Note>
          {portEditsTotal} edit{portEditsTotal === 1 ? "" : "s"} across {pageCount} page
          {pageCount === 1 ? "" : "s"}
        </Note>
      </div>

      <PortEditsTable portEdits={portEdits} />
    </div>
  )
}

export default withAdminPage(PortEditsPage)

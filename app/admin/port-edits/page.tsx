import { formatDate } from "@primoui/utils"
import type { SearchParams } from "nuqs/server"
import { withAdminPage } from "~/components/admin/auth-hoc"
import { H3 } from "~/components/common/heading"
import { Note } from "~/components/common/note"
import { findPortEdits } from "~/server/admin/port-edits/queries"
import { portEditsTableParamsCache } from "~/server/admin/port-edits/schema"

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

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Port</th>
              <th className="px-4 py-3 text-left font-medium">Editor</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {portEdits.map(portEdit => (
              <tr key={portEdit.id} className="border-t">
                <td className="px-4 py-3">{portEdit.port?.name ?? "Unknown"}</td>
                <td className="px-4 py-3">{portEdit.editor?.name ?? "Unknown"}</td>
                <td className="px-4 py-3">{portEdit.status}</td>
                <td className="px-4 py-3">{formatDate(portEdit.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default withAdminPage(PortEditsPage)

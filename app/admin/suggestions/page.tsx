import type { SearchParams } from "nuqs/server"
import { Suspense } from "react"
import { withAdminPage } from "~/components/admin/auth-hoc"
import { DataTableSkeleton } from "~/components/data-table/data-table-skeleton"
import { findSuggestions } from "~/server/admin/suggestions/queries"
import { suggestionsTableParamsCache } from "~/server/admin/suggestions/schema"

type SuggestionsPageProps = {
  searchParams: Promise<SearchParams>
}

const SuggestionsPage = async ({ searchParams }: SuggestionsPageProps) => {
  const search = suggestionsTableParamsCache.parse(await searchParams)
  const suggestionsPromise = findSuggestions(search)

  return (
    <Suspense fallback={<DataTableSkeleton title="Suggestions" />}>
      <SuggestionsTable suggestionsPromise={suggestionsPromise} />
    </Suspense>
  )
}

export default withAdminPage(SuggestionsPage)

// Inline table component for now - full table component would be created separately
const SuggestionsTable = async ({
  suggestionsPromise,
}: { suggestionsPromise: ReturnType<typeof findSuggestions> }) => {
  const { suggestions } = await suggestionsPromise

  return (
    <div className="rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Name</th>
            <th className="px-4 py-3 text-left font-medium">Type</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-left font-medium">Submitted</th>
          </tr>
        </thead>
        <tbody>
          {suggestions.map(suggestion => (
            <tr key={suggestion.id} className="border-t">
              <td className="px-4 py-3">{suggestion.name}</td>
              <td className="px-4 py-3">{suggestion.type}</td>
              <td className="px-4 py-3">{suggestion.status}</td>
              <td className="px-4 py-3">{new Date(suggestion.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

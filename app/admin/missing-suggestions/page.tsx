import { formatDate } from "@primoui/utils"
import type { MissingSuggestionStatus, MissingSuggestionType } from "@prisma/client"
import type { SearchParams } from "nuqs/server"
import { Suspense } from "react"
import { withAdminPage } from "~/components/admin/auth-hoc"
import { Badge } from "~/components/common/badge"
import { Link } from "~/components/common/link"
import { DataTableSkeleton } from "~/components/data-table/data-table-skeleton"
import { findMissingSuggestions } from "~/server/admin/missing-suggestions/queries"
import { missingSuggestionsTableParamsCache } from "~/server/admin/missing-suggestions/schema"
import { MissingSuggestionStatusSelect } from "./status-select"

type MissingSuggestionsPageProps = {
  searchParams: Promise<SearchParams>
}

const MissingSuggestionsPage = async ({ searchParams }: MissingSuggestionsPageProps) => {
  const search = missingSuggestionsTableParamsCache.parse(await searchParams)
  const missingSuggestionsPromise = findMissingSuggestions(search)

  return (
    <Suspense fallback={<DataTableSkeleton title="Missing suggestions" />}>
      <MissingSuggestionsTable missingSuggestionsPromise={missingSuggestionsPromise} />
    </Suspense>
  )
}

export default withAdminPage(MissingSuggestionsPage)

const statusVariant = (status: MissingSuggestionStatus) => {
  if (status === "Fulfilled") return "success"
  if (status === "Planned") return "info"
  if (status === "Dismissed") return "warning"
  return "outline"
}

const typeVariant = (type: MissingSuggestionType) => {
  if (type === "Theme") return "info"
  if (type === "Platform") return "success"
  if (type === "Port") return "primary"
  return "soft"
}

const MissingSuggestionsTable = async ({
  missingSuggestionsPromise,
}: {
  missingSuggestionsPromise: ReturnType<typeof findMissingSuggestions>
}) => {
  const { missingSuggestions, missingSuggestionsTotal } = await missingSuggestionsPromise

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Missing suggestions</h1>
        <p className="text-sm text-muted-foreground">
          {missingSuggestionsTotal.toLocaleString()} anonymous requests from search.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Suggestion</th>
              <th className="px-4 py-3 text-left font-medium">Context</th>
              <th className="px-4 py-3 text-left font-medium">Demand</th>
              <th className="px-4 py-3 text-left font-medium">Links</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {missingSuggestions.map(suggestion => (
              <tr key={suggestion.id} className="border-t align-top">
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-foreground">{suggestion.label}</span>
                    <Badge variant={typeVariant(suggestion.type)} className="w-fit">
                      {suggestion.type}
                    </Badge>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {suggestion.themeName || suggestion.platformName ? (
                    <span>
                      {[suggestion.themeName, suggestion.platformName].filter(Boolean).join(" / ")}
                    </span>
                  ) : (
                    "None"
                  )}
                </td>
                <td className="px-4 py-3">{suggestion._count.votes.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex max-w-72 flex-col gap-1">
                    <span>{suggestion._count.links.toLocaleString()}</span>
                    {suggestion.links.map(link => (
                      <Link
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-xs text-muted-foreground underline"
                      >
                        {link.url}
                      </Link>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-2">
                    <Badge variant={statusVariant(suggestion.status)} className="w-fit">
                      {suggestion.status}
                    </Badge>
                    <MissingSuggestionStatusSelect id={suggestion.id} status={suggestion.status} />
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(suggestion.updatedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

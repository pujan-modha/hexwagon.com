import { formatDate } from "@primoui/utils"
import { AdStatusBadge } from "~/components/admin/ad-status-badge"
import { Badge } from "~/components/common/badge"
import { Card } from "~/components/common/card"
import { H4 } from "~/components/common/heading"
import { Note } from "~/components/common/note"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/common/table"
import type { AdAdminMany } from "~/server/admin/ads/payloads"
import type { AdPricingMap } from "~/server/web/ads/queries"
import { AdActions } from "./ad-actions"

type AdsTableProps = {
  ads: AdAdminMany[]
  pricing: AdPricingMap
}

export const AdsTable = ({ ads, pricing }: AdsTableProps) => {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-2 border-b p-5">
        <H4 as="h1">Ads</H4>
        <Note>Pending ads stay hidden until approved. Use the pricing panel above to change spot rates.</Note>
      </div>

      <div className="overflow-auto">
        <Table style={{ ["--table-columns" as string]: "minmax(18rem, 1.8fr) 7rem 7rem 7rem 7rem 7rem 4rem" }}>
          <TableHeader>
            <TableRow className="h-auto items-start py-3">
              <TableHead>Ad</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Starts</TableHead>
              <TableHead>Ends</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {ads.map(ad => (
              <TableRow key={ad.id} className="h-auto items-start py-4">
                <TableCell className="py-4 align-top">
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <strong className="truncate font-medium">{ad.name}</strong>
                    <Note className="line-clamp-2">{ad.description ?? ad.websiteUrl}</Note>
                    <span className="truncate text-xs text-muted-foreground">{ad.websiteUrl}</span>
                  </div>
                </TableCell>

                <TableCell className="py-4 align-top">
                  <Badge variant="outline">{ad.type}</Badge>
                </TableCell>

                <TableCell className="py-4 align-top">
                  <AdStatusBadge status={ad.status} />
                </TableCell>

                <TableCell className="py-4 align-top text-sm font-medium tabular-nums">
                  <div className="flex flex-col gap-1">
                    <span>{ad.priceCents ? `$${(ad.priceCents / 100).toFixed(2)}` : "—"}</span>
                    {ad.paidAt !== null && (
                      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Paid</span>
                    )}
                  </div>
                </TableCell>

                <TableCell className="py-4 align-top">
                  <Note>{formatDate(ad.startsAt)}</Note>
                </TableCell>

                <TableCell className="py-4 align-top">
                  <Note>{formatDate(ad.endsAt)}</Note>
                </TableCell>

                <TableCell className="py-4 align-top text-right">
                  <AdActions ad={ad} pricing={pricing} />
                </TableCell>
              </TableRow>
            ))}

            {ads.length === 0 && (
              <TableRow aria-disabled className="h-24">
                <TableCell className="col-span-full text-center py-10">
                  <Note>No ads yet.</Note>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
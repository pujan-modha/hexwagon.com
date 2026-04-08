import Link from "next/link"
import type { SearchParams } from "nuqs/server"
import { AdFixedSlotOverrideManager } from "~/components/admin/ad-fixed-slot-override-manager"
import { AdPackagePricingManager } from "~/components/admin/ad-package-pricing-manager"
import { withAdminPage } from "~/components/admin/auth-hoc"
import { Wrapper } from "~/components/admin/wrapper"
import { Badge } from "~/components/common/badge"
import {
  type AdStatusFilterValue,
  findAdStatusCounts,
  findAds,
  findFixedSlotCandidates,
  findFixedSlotOverrides,
} from "~/server/admin/ads/queries"
import { getAdPackagePricing } from "~/server/web/ads/queries"
import { adStatus } from "~/utils/ads"
import { cx } from "~/utils/cva"
import { AdsTable } from "./_components/ads-table"
import { CreateAdButton } from "./_components/create-ad-button"

type AdsPageProps = {
  searchParams: Promise<SearchParams>
}

const statusFilters: Array<{ value: AdStatusFilterValue; label: string }> = [
  { value: "All", label: "All" },
  { value: adStatus.Pending, label: "Pending" },
  { value: adStatus.PendingEdit, label: "Pending edits" },
  { value: adStatus.Approved, label: "Approved" },
  { value: adStatus.Rejected, label: "Rejected" },
  { value: adStatus.Cancelled, label: "Cancelled" },
]

const statusFilterValues = new Set(statusFilters.map(filter => filter.value))

const AdsPage = async ({ searchParams }: AdsPageProps) => {
  const rawStatus = (await searchParams).status
  const selectedStatus =
    typeof rawStatus === "string" && statusFilterValues.has(rawStatus as AdStatusFilterValue)
      ? (rawStatus as AdStatusFilterValue)
      : "All"

  const [ads, statusCounts, packagePricing, fixedOverrides, fixedCandidates] = await Promise.all([
    findAds({ status: selectedStatus }),
    findAdStatusCounts(),
    getAdPackagePricing(),
    findFixedSlotOverrides(),
    findFixedSlotCandidates(),
  ])

  return (
    <Wrapper size="lg">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Ads</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Review bookings, manage package pricing, and create direct deals without leaving the
              dashboard.
            </p>
          </div>

          <CreateAdButton />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <AdPackagePricingManager initialPricing={packagePricing} />
          <AdFixedSlotOverrideManager overrides={fixedOverrides} candidates={fixedCandidates} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {statusFilters.map(filter => {
            const isActive = filter.value === selectedStatus
            const href =
              filter.value === "All"
                ? "/admin/ads"
                : `/admin/ads?status=${encodeURIComponent(filter.value)}`

            return (
              <Link
                key={filter.value}
                href={href}
                className={cx(
                  "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors",
                  isActive
                    ? "border-foreground/20 bg-foreground/5 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                <span>{filter.label}</span>
                <Badge size="sm" variant={isActive ? "info" : "soft"}>
                  {statusCounts[filter.value]}
                </Badge>
              </Link>
            )
          })}
        </div>

        <AdsTable ads={ads} />
      </div>
    </Wrapper>
  )
}

export default withAdminPage(AdsPage)

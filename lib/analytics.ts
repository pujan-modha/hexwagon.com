import type { Logger } from "inngest/middleware/logger"
import { env } from "~/env"
import { OpenPanelInsightsError, fetchOpenPanelInsights } from "~/services/openpanel"
import { tryCatch } from "~/utils/helpers"

type OpenPanelMetricsResponse = {
  metrics?: {
    unique_visitors?: number
    total_screen_views?: number
  }
  series?: {
    date: string
    unique_visitors?: number
    total_screen_views?: number
  }[]
}

const createPathFilter = (page: string) =>
  JSON.stringify([
    {
      name: "path",
      operator: "is",
      value: [page],
    },
  ])

const getMetricsPath = () => `/${env.OPENPANEL_PROJECT_ID}/metrics`

const isIgnorableInsightsError = (error: unknown) =>
  error instanceof OpenPanelInsightsError && [401, 403, 404].includes(error.status)

/**
 * Get the page analytics for a given page and period
 * @param page - The page to get the analytics for
 * @param period - The period to get the analytics for
 * @returns The page analytics
 */
const getPageAnalytics = async (page: string, period = "30d") => {
  const { data, error } = await tryCatch(
    fetchOpenPanelInsights<OpenPanelMetricsResponse>(getMetricsPath(), {
      range: period,
      filters: createPathFilter(page),
    }),
  )

  if (error) {
    if (!isIgnorableInsightsError(error)) {
      console.error("Analytics error:", error)
    }
    return { visitors: 0, pageviews: 0 }
  }

  return {
    visitors: data.metrics?.unique_visitors ?? 0,
    pageviews: data.metrics?.total_screen_views ?? 0,
  }
}

/**
 * Get the total analytics for a given period
 * @param period - The period to get the analytics for
 * @returns The total analytics
 */
export const getTotalAnalytics = async (period = "30d") => {
  const { data, error } = await tryCatch(
    fetchOpenPanelInsights<OpenPanelMetricsResponse>(getMetricsPath(), {
      range: period,
    }),
  )

  if (error) {
    if (!isIgnorableInsightsError(error)) {
      console.error("Analytics error:", error)
    }
    return { results: [], totalVisitors: 0, averageVisitors: 0 }
  }

  const series = data.series ?? []
  const totalVisitors =
    data.metrics?.unique_visitors ??
    series.reduce((acc, curr) => acc + (curr.unique_visitors ?? 0), 0)
  const averageVisitors = series.length ? totalVisitors / series.length : 0
  const results = series.map(({ date, unique_visitors }) => ({
    date: date.split("T")[0] ?? date,
    visitors: unique_visitors ?? 0,
  }))

  return { results, totalVisitors, averageVisitors }
}

type FetchAnalyticsInBatchesParams = {
  data: {
    id: string
    name: string
    slug: string
    pageviews?: number | null
  }[]
  pathPrefix: string
  logger: Logger
  batchSize?: number
  onSuccess: (id: string, data: { pageviews: number }) => Promise<void>
}

/**
 * Fetch analytics data in batches
 * @param params - The parameters for the fetch
 */
export const fetchAnalyticsInBatches = async ({
  data,
  pathPrefix,
  logger,
  onSuccess,
  batchSize = 5,
}: FetchAnalyticsInBatchesParams) => {
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize)
    await Promise.all(
      batch.map(async entity => {
        const result = await tryCatch(getPageAnalytics(`${pathPrefix}${entity.slug}`))

        if (result.error) {
          logger.error(`Failed to fetch analytics data for ${entity.name}`, {
            error: result.error,
            slug: entity.slug,
          })
          return null
        }

        await onSuccess(entity.id, {
          pageviews: result.data.pageviews ?? entity.pageviews ?? 0,
        })
      }),
    )
  }
}

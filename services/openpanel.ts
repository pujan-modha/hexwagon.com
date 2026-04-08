import { env } from "~/env"

const normalizedApiUrl = env.OPENPANEL_API_URL.replace(/\/$/, "")
const OPENPANEL_INSIGHTS_BASE_URL =
  env.OPENPANEL_INSIGHTS_BASE_URL ?? `${normalizedApiUrl}/insights`

export class OpenPanelInsightsError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "OpenPanelInsightsError"
    this.status = status
  }
}

type QueryValue = string | number | boolean

type OpenPanelQuery = Record<string, QueryValue | QueryValue[]>

const buildInsightsUrl = (path: string, query?: OpenPanelQuery) => {
  const url = new URL(`${OPENPANEL_INSIGHTS_BASE_URL}${path}`)

  if (!query) {
    return url
  }

  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(key, String(item))
      }
      continue
    }

    url.searchParams.set(key, String(value))
  }

  return url
}

export const fetchOpenPanelInsights = async <T>(path: string, query?: OpenPanelQuery) => {
  const response = await fetch(buildInsightsUrl(path, query), {
    headers: {
      "openpanel-client-id": env.OPENPANEL_CLIENT_ID,
      "openpanel-client-secret": env.OPENPANEL_CLIENT_SECRET,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new OpenPanelInsightsError(
      response.status,
      `OpenPanel insights request failed with status ${response.status}${errorText ? `: ${errorText}` : ""}`,
    )
  }

  return (await response.json()) as T
}

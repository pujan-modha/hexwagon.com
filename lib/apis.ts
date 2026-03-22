import wretch from "wretch"

export const analyzerApi = wretch(process.env.STACK_ANALYZER_API_URL ?? "")
  .headers(process.env.STACK_ANALYZER_API_KEY ? { "X-API-Key": process.env.STACK_ANALYZER_API_KEY } : {})
  .errorType("json")
  .resolve(r => r.json<string[]>())

export const brandLinkApi = wretch("https://brandlink.piotr-f64.workers.dev/api")
  .errorType("json")
  .resolve(r => r.json<Record<string, (Record<string, string> & { url: string })[]>>())

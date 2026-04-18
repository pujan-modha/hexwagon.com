import { serve } from "inngest/next"
import { indexData } from "~/functions/cron.index-data"
import { inngest } from "~/services/inngest"

export const maxDuration = 60

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [indexData],
})

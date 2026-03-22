import { serve } from "inngest/next"
import { fetchData } from "~/functions/cron.fetch-data"
import { indexData } from "~/functions/cron.index-data"
import { publishPorts } from "~/functions/cron.publish-ports"
import { inngest } from "~/services/inngest"

export const maxDuration = 60

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [fetchData, indexData, publishPorts],
})

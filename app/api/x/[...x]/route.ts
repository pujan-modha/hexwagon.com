import { createRouteHandler } from "@openpanel/nextjs/server"
import { env } from "~/env"

const baseHandler = createRouteHandler({
  apiUrl: env.OPENPANEL_API_URL,
})

const handler = (request: Request) => {
  const url = new URL(request.url)

  if (request.method === "GET" && url.pathname.endsWith("/s.js")) {
    url.pathname = url.pathname.replace(/\/s\.js$/, "/op1.js")
    return baseHandler(new Request(url.toString(), request))
  }

  return baseHandler(request)
}

export const GET = handler
export const POST = handler

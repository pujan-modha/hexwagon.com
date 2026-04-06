import { createRouteHandler } from "@openpanel/nextjs/server";
import { env } from "~/env";

export const { GET, POST } = createRouteHandler({
  apiUrl: env.OPENPANEL_API_URL,
});

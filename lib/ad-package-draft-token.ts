import { createHmac, timingSafeEqual } from "node:crypto"
import { AdBillingCycle } from "@prisma/client"
import { z } from "zod"
import { env } from "~/env"

const TOKEN_TTL_SECONDS = 60 * 60

const adPackageDraftPayloadSchema = z.object({
  billingCycle: z.nativeEnum(AdBillingCycle),
  themeIds: z.array(z.string()).max(50),
  platformIds: z.array(z.string()).max(50),
  exp: z.number().int().positive(),
})

export type AdPackageDraftPayload = z.infer<typeof adPackageDraftPayloadSchema>

const sign = (value: string) => {
  return createHmac("sha256", env.BETTER_AUTH_SECRET).update(value).digest("base64url")
}

export const createAdPackageDraftToken = ({
  billingCycle,
  themeIds,
  platformIds,
}: {
  billingCycle: AdBillingCycle
  themeIds: string[]
  platformIds: string[]
}) => {
  const payload = Buffer.from(
    JSON.stringify({
      billingCycle,
      themeIds,
      platformIds,
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
    }),
    "utf8",
  ).toString("base64url")

  return `${payload}.${sign(payload)}`
}

export const verifyAdPackageDraftToken = (token: string) => {
  const [payloadPart, signaturePart] = token.split(".")

  if (!payloadPart || !signaturePart) {
    return null
  }

  const expectedSignature = sign(payloadPart)
  const actualBuffer = Buffer.from(signaturePart, "utf8")
  const expectedBuffer = Buffer.from(expectedSignature, "utf8")

  if (actualBuffer.length !== expectedBuffer.length) {
    return null
  }

  if (!timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null
  }

  try {
    const parsed = adPackageDraftPayloadSchema.parse(
      JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8")),
    )

    if (parsed.exp < Math.floor(Date.now() / 1000)) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

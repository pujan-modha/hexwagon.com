import { createHmac, timingSafeEqual } from "node:crypto"
import { env } from "~/env"

const TOKEN_TTL_SECONDS = 60 * 30

type SessionTokenPayload = {
  sid: string
  exp: number
}

const sign = (value: string) => {
  return createHmac("sha256", env.BETTER_AUTH_SECRET).update(value).digest("base64url")
}

const parsePayload = (value: string): SessionTokenPayload | null => {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"))

    if (
      typeof parsed !== "object" ||
      !parsed ||
      typeof parsed.sid !== "string" ||
      typeof parsed.exp !== "number"
    ) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export const createAdCheckoutSessionToken = (sessionId: string) => {
  const payload = Buffer.from(
    JSON.stringify({
      sid: sessionId,
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
    }),
    "utf8",
  ).toString("base64url")

  return `${payload}.${sign(payload)}`
}

export const verifyAdCheckoutSessionToken = ({
  token,
  sessionId,
}: {
  token: string
  sessionId: string
}) => {
  const [payloadPart, signaturePart] = token.split(".")

  if (!payloadPart || !signaturePart) {
    return false
  }

  const expectedSignature = sign(payloadPart)
  const actualBuffer = Buffer.from(signaturePart, "utf8")
  const expectedBuffer = Buffer.from(expectedSignature, "utf8")

  if (actualBuffer.length !== expectedBuffer.length) {
    return false
  }

  if (!timingSafeEqual(actualBuffer, expectedBuffer)) {
    return false
  }

  const payload = parsePayload(payloadPart)

  if (!payload || payload.sid !== sessionId) {
    return false
  }

  const now = Math.floor(Date.now() / 1000)
  return payload.exp >= now
}

import { headers } from "next/headers"
import { isDev } from "~/env"
import { redis } from "~/services/redis"

type HeaderSource = {
  get: (name: string) => string | null
}

type RateLimitOptions = {
  bypass?: boolean
}

const limiters = {
  submission: { limit: 5, windowSeconds: 24 * 60 * 60 }, // 5 submissions per day
  report: { limit: 5, windowSeconds: 60 * 60 }, // 5 submissions per hour
  newsletter: { limit: 3, windowSeconds: 24 * 60 * 60 }, // 3 attempts per day
  claim: { limit: 5, windowSeconds: 60 * 60 }, // 5 attempts per hour
  comment: { limit: 10, windowSeconds: 60 * 60 }, // 10 comments per hour
  adSlotRead: { limit: 120, windowSeconds: 60 }, // 120 requests per minute
  checkoutStatusRead: { limit: 90, windowSeconds: 60 }, // 90 requests per minute
  adClickWrite: { limit: 180, windowSeconds: 60 }, // 180 clicks per minute
  healthRead: { limit: 30, windowSeconds: 60 }, // 30 checks per minute
}

const FALLBACK_IP_ADDRESS = "0.0.0.0"

const getForwardedIp = (headerValue: string | null) => {
  if (!headerValue) return null
  const firstIp = headerValue.split(",")[0]?.trim()
  return firstIp || null
}

/**
 * Get the IP address of the client
 * @param source - Header source
 * @returns IP address
 */
export const getIPFromHeaders = (source: HeaderSource) => {
  const forwardedFor = getForwardedIp(source.get("x-forwarded-for"))
  if (forwardedFor) return forwardedFor

  const realIp = source.get("x-real-ip")
  if (realIp) return realIp

  const flyClientIp = source.get("fly-client-ip")
  if (flyClientIp) return flyClientIp

  const cfConnectingIp = source.get("cf-connecting-ip")
  if (cfConnectingIp) return cfConnectingIp

  return FALLBACK_IP_ADDRESS
}

/**
 * Get the IP address of the current request
 * @returns IP address
 */
export const getIP = async () => {
  return getIPFromHeaders(await headers())
}

/**
 * Check if the user is rate limited
 * @param id - The identifier to check
 * @param action - The action to check
 * @returns True if the user is rate limited, false otherwise
 */
export const isRateLimited = async (
  id: string,
  action: keyof typeof limiters,
  options: RateLimitOptions = {},
) => {
  if (options.bypass || isDev) {
    return false // Disable rate limiting in development
  }

  const limiter = limiters[action]
  const currentWindow = Math.floor(Date.now() / (limiter.windowSeconds * 1000))
  const key = `rate-limit:${action}:${id}:${currentWindow}`

  try {
    const count = await redis.incr(key)

    if (count === 1) {
      await redis.expire(key, limiter.windowSeconds)
    }

    return count > limiter.limit
  } catch (error) {
    console.error("Rate limiter error:", error)
    return false // Fail open to prevent blocking legitimate users
  }
}

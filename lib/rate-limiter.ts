"use server";

import { headers } from "next/headers";
import { isDev } from "~/env";
import { redis } from "~/services/redis";

const limiters = {
  submission: { limit: 5, windowSeconds: 24 * 60 * 60 }, // 5 submissions per day
  report: { limit: 5, windowSeconds: 60 * 60 }, // 5 submissions per hour
  newsletter: { limit: 3, windowSeconds: 24 * 60 * 60 }, // 3 attempts per day
  claim: { limit: 5, windowSeconds: 60 * 60 }, // 5 attempts per hour
  comment: { limit: 10, windowSeconds: 60 * 60 }, // 10 comments per hour
};

/**
 * Get the IP address of the client
 * @returns IP address
 */
export const getIP = async () => {
  const FALLBACK_IP_ADDRESS = "0.0.0.0";
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0] ?? FALLBACK_IP_ADDRESS;
  }

  return headersList.get("x-real-ip") ?? FALLBACK_IP_ADDRESS;
};

/**
 * Check if the user is rate limited
 * @param id - The identifier to check
 * @param action - The action to check
 * @returns True if the user is rate limited, false otherwise
 */
export const isRateLimited = async (
  id: string,
  action: keyof typeof limiters,
) => {
  if (isDev) {
    return false; // Disable rate limiting in development
  }

  const limiter = limiters[action];
  const currentWindow = Math.floor(Date.now() / (limiter.windowSeconds * 1000));
  const key = `rate-limit:${action}:${id}:${currentWindow}`;

  try {
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, limiter.windowSeconds);
    }

    return count > limiter.limit;
  } catch (error) {
    console.error("Rate limiter error:", error);
    return false; // Fail open to prevent blocking legitimate users
  }
};

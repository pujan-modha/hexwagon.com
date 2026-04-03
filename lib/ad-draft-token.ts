import { AdType } from "@prisma/client";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "~/env";
import { redis } from "~/services/redis";

const TOKEN_TTL_SECONDS = 60 * 60;

const adDraftItemSchema = z.object({
  type: z.enum([AdType.Banner, AdType.Listing, AdType.Sidebar, AdType.Footer]),
  startsAt: z.number().int().positive(),
  endsAt: z.number().int().positive(),
  priceCents: z.number().int().nonnegative(),
});

const adDraftPayloadSchema = z.object({
  ads: z.array(adDraftItemSchema).min(1),
  exp: z.number().int().positive(),
});

export type AdDraftItem = z.infer<typeof adDraftItemSchema>;

const getTokenKey = (token: string) => {
  const hash = createHash("sha256").update(token).digest("hex");
  return `ad:draft:used:${hash}`;
};

const sign = (value: string) => {
  return createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(value)
    .digest("base64url");
};

export const createAdDraftToken = (ads: AdDraftItem[]) => {
  const payload = Buffer.from(
    JSON.stringify({
      ads,
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
    }),
    "utf8",
  ).toString("base64url");

  return `${payload}.${sign(payload)}`;
};

export const verifyAdDraftToken = (token: string) => {
  const [payloadPart, signaturePart] = token.split(".");

  if (!payloadPart || !signaturePart) {
    return null;
  }

  const expectedSignature = sign(payloadPart);
  const actualBuffer = Buffer.from(signaturePart, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (actualBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = adDraftPayloadSchema.parse(
      JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8")),
    );

    if (parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

export const consumeAdDraftToken = async (token: string) => {
  const parsed = verifyAdDraftToken(token);

  if (!parsed) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const ttlSeconds = Math.max(parsed.exp - now, 1);
  const key = getTokenKey(token);

  const result = await redis.set(key, "1", {
    nx: true,
    ex: ttlSeconds,
  });

  if (result !== "OK") {
    return null;
  }

  return parsed;
};

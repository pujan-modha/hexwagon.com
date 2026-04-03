import { randomUUID } from "node:crypto"
import { AdBillingCycle } from "@prisma/client"
import { z } from "zod"
import { redis } from "~/services/redis"

const CHECKOUT_DRAFT_TTL_SECONDS = 60 * 60 * 24

const adPackageCheckoutDraftSchema = z.object({
  billingCycle: z.nativeEnum(AdBillingCycle),
  themeIds: z.array(z.string()),
  platformIds: z.array(z.string()),
  packageBasePriceCents: z.number().int().nonnegative(),
  packageDiscountedPriceCents: z.number().int().nonnegative(),
  targetingUnitPriceCents: z.number().int().nonnegative(),
  targetingTargetCount: z.number().int().nonnegative(),
  targetingTotalPriceCents: z.number().int().nonnegative(),
  totalAmountCents: z.number().int().positive(),
  adDetails: z.object({
    email: z.string().email(),
    name: z.string().min(1),
    description: z.string().min(1),
    websiteUrl: z.string().url(),
    buttonLabel: z.string().optional(),
    faviconUrl: z.string().url().nullable().optional(),
  }),
})

export type AdPackageCheckoutDraft = z.infer<typeof adPackageCheckoutDraftSchema>

const getDraftKey = (draftId: string) => `ad:package:checkout:${draftId}`

export const createAdPackageCheckoutDraft = async (payload: AdPackageCheckoutDraft) => {
  const draftId = randomUUID()

  await redis.set(getDraftKey(draftId), JSON.stringify(payload), {
    ex: CHECKOUT_DRAFT_TTL_SECONDS,
  })

  return draftId
}

export const getAdPackageCheckoutDraft = async (draftId: string) => {
  const value = await redis.get<string>(getDraftKey(draftId))

  if (!value) {
    return null
  }

  try {
    const parsed = adPackageCheckoutDraftSchema.parse(JSON.parse(value))
    return parsed
  } catch {
    return null
  }
}

import { z } from "zod"
import { adStatus } from "~/utils/ads"

export const adSpotValues = ["Banner", "Listing", "Sidebar", "Footer", "All"] as const

export const adStatusValues = [
  adStatus.Pending,
  adStatus.PendingEdit,
  adStatus.Approved,
  adStatus.Rejected,
  adStatus.Cancelled,
] as const

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a valid date (YYYY-MM-DD).")

const adFormBaseSchema = z.object({
  spot: z.enum(adSpotValues),
  email: z.string().email("Must be a valid email address.").max(255),
  name: z.string().min(1, "Ad name is required.").max(255),
  description: z.string().max(500).optional().or(z.literal("")),
  destinationUrl: z.string().url("Must be a valid URL.").max(2048),
  faviconUrl: z.string().url("Must be a valid image URL.").max(2048).optional().or(z.literal("")),
  startsAt: isoDateSchema,
  endsAt: isoDateSchema,
  priceCents: z.number().int().nonnegative("Price must be zero or more."),
  status: z.enum(adStatusValues),
  markAsPaid: z.boolean().optional(),
  buttonLabel: z.string().max(80).optional().or(z.literal("")),
  themeIds: z.array(z.string().min(1)).max(50).default([]),
  platformIds: z.array(z.string().min(1)).max(50).default([]),
  useCustomCode: z.boolean().optional(),
  customHtml: z.string().optional().or(z.literal("")),
  customCss: z.string().optional().or(z.literal("")),
  customJs: z.string().optional().or(z.literal("")),
})

export const rejectAdSchema = z.object({
  adId: z.string().min(1),
  reason: z.string().min(1, "Rejection reason is required.").max(1000),
})

export const adFormSchema = adFormBaseSchema.refine(
  d => new Date(d.endsAt) >= new Date(d.startsAt),
  {
    message: "End date must be on or after start date.",
    path: ["endsAt"],
  },
)

export const createAdSchema = adFormSchema

export const updateAdSchema = adFormBaseSchema
  .extend({
    adId: z.string().min(1),
  })
  .refine(d => new Date(d.endsAt) >= new Date(d.startsAt), {
    message: "End date must be on or after start date.",
    path: ["endsAt"],
  })

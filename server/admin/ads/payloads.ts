import { Prisma } from "@prisma/client"

export const adAdminPayload = Prisma.validator<Prisma.AdSelect>()({
  id: true,
  email: true,
  name: true,
  description: true,
  websiteUrl: true,
  buttonLabel: true,
  faviconUrl: true,
  type: true,
  status: true,
  startsAt: true,
  endsAt: true,
  priceCents: true,
  approvedAt: true,
  rejectedAt: true,
  cancelledAt: true,
  paidAt: true,
  adminNote: true,
  customHtml: true,
  customCss: true,
  customJs: true,
  billingProvider: true,
  billingCheckoutReferenceId: true,
  billingSubscriptionId: true,
  billingLastPaymentId: true,
  billingCycle: true,
  packageBasePriceCents: true,
  packageDiscountedPriceCents: true,
  targetingUnitPriceCents: true,
  targetingTargetCount: true,
  targetingTotalPriceCents: true,
  clickCount: true,
  lastClickedAt: true,
  refundAmountCents: true,
  billingRefundId: true,
  refundedAt: true,
  targetThemes: {
    select: {
      id: true,
      name: true,
      faviconUrl: true,
    },
  },
  targetPlatforms: {
    select: {
      id: true,
      name: true,
      faviconUrl: true,
    },
  },
  createdAt: true,
  updatedAt: true,
})

export type AdAdminMany = Prisma.AdGetPayload<{
  select: typeof adAdminPayload
}>

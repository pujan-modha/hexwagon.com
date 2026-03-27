import { Prisma } from "@prisma/client";

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
  sessionId: true,
  subscriptionId: true,
  createdAt: true,
  updatedAt: true,
});

export type AdAdminMany = Prisma.AdGetPayload<{
  select: typeof adAdminPayload;
}>;

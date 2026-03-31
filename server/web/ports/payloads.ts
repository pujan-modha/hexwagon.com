import { Prisma } from "@prisma/client";
import { platformManyPayload } from "~/server/web/platforms/payloads";
import { tagManyPayload } from "~/server/web/tags/payloads";
import { themeManyPayload } from "~/server/web/themes/payloads";

export const portOnePayload = Prisma.validator<Prisma.PortSelect>()({
  id: true,
  slug: true,
  name: true,
  description: true,
  content: true,
  repositoryUrl: true,
  screenshotUrl: true,
  faviconUrl: true,
  isOfficial: true,
  isFeatured: true,
  score: true,
  stars: true,
  forks: true,
  firstCommitDate: true,
  lastCommitDate: true,
  status: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  affiliateUrl: true,
  rejectionReason: true,
  license: true,
  theme: { select: themeManyPayload },
  platform: { select: platformManyPayload },
  author: { select: { id: true, name: true, image: true } },
  authorId: true,
  tags: { select: tagManyPayload },
});

export const portManyPayload = Prisma.validator<Prisma.PortSelect>()({
  id: true,
  slug: true,
  name: true,
  description: true,
  content: true,
  repositoryUrl: true,
  faviconUrl: true,
  screenshotUrl: true,
  isOfficial: true,
  isFeatured: true,
  status: true,
  pageviews: true,
  score: true,
  stars: true,
  forks: true,
  firstCommitDate: true,
  lastCommitDate: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  authorId: true,
  license: true,
  theme: { select: themeManyPayload },
  platform: { select: platformManyPayload },
  tags: { select: tagManyPayload },
});

export const portManyExtendedPayload = Prisma.validator<Prisma.PortSelect>()({
  id: true,
  slug: true,
  name: true,
  description: true,
  content: true,
  repositoryUrl: true,
  faviconUrl: true,
  screenshotUrl: true,
  stars: true,
  forks: true,
  isOfficial: true,
  isFeatured: true,
  status: true,
  pageviews: true,
  firstCommitDate: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  authorId: true,
  license: true,
  theme: { select: themeManyPayload },
  platform: { select: platformManyPayload },
});

export type PortOne = Prisma.PortGetPayload<{ select: typeof portOnePayload }>;
export type PortMany = Prisma.PortGetPayload<{
  select: typeof portManyPayload;
}>;
export type PortManyExtended = Prisma.PortGetPayload<{
  select: typeof portManyExtendedPayload;
}>;

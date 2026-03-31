import { Prisma, PortStatus } from "@prisma/client";
import { adOnePayload } from "~/server/web/ads/payloads";

export const colorPalettePayload =
  Prisma.validator<Prisma.ColorPaletteSelect>()({
    id: true,
    paletteName: true,
    label: true,
    hex: true,
    order: true,
  });

export const themeOnePayload = Prisma.validator<Prisma.ThemeSelect>()({
  id: true,
  name: true,
  slug: true,
  description: true,
  websiteUrl: true,
  repositoryUrl: true,
  faviconUrl: true,
  guidelines: true,
  isFeatured: true,
  pageviews: true,
  createdAt: true,
  updatedAt: true,
  license: true,
  adId: true,
  ad: { select: adOnePayload },
  _count: {
    select: {
      ports: { where: { status: PortStatus.Published } },
    },
  },
  colors: {
    select: colorPalettePayload,
    orderBy: { order: "asc" },
  },
  maintainers: {
    select: {
      userId: true,
      user: { select: { id: true, name: true, image: true } },
    },
  },
});

export const themeManyPayload = Prisma.validator<Prisma.ThemeSelect>()({
  id: true,
  name: true,
  slug: true,
  description: true,
  faviconUrl: true,
  repositoryUrl: true,
  isFeatured: true,
  order: true,
  pageviews: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      ports: { where: { status: PortStatus.Published } },
    },
  },
});

export type ThemeOne = Prisma.ThemeGetPayload<{
  select: typeof themeOnePayload;
}>;
export type ThemeMany = Prisma.ThemeGetPayload<{
  select: typeof themeManyPayload;
}>;

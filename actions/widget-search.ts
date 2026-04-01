"use server";

import { createServerAction } from "zsa";
import { z } from "zod";
import { db } from "~/services/db";

export const searchThemesAction = createServerAction()
  .input(z.object({ query: z.string().trim().min(2) }))
  .handler(async ({ input: { query } }) => {
    const themes = await db.theme.findMany({
      where: {
        name: { contains: query, mode: "insensitive" },
      },
      select: { id: true, name: true, slug: true },
      take: 10,
      orderBy: { name: "asc" },
    });
    return themes;
  });

export const searchPlatformsAction = createServerAction()
  .input(z.object({ query: z.string().trim().min(2) }))
  .handler(async ({ input: { query } }) => {
    const platforms = await db.platform.findMany({
      where: {
        name: { contains: query, mode: "insensitive" },
      },
      select: { id: true, name: true, slug: true },
      take: 10,
      orderBy: { name: "asc" },
    });
    return platforms;
  });

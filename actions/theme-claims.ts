"use server";

import { ThemeMaintainerClaimStatus } from "@prisma/client";
import { headers } from "next/headers";
import { z } from "zod";
import { createServerAction } from "zsa";
import { auth } from "~/lib/auth";
import { getIP, isRateLimited } from "~/lib/rate-limiter";
import { db } from "~/services/db";

const submitThemeClaimSchema = z.object({
  themeId: z.string(),
  claimantName: z.string().min(2).max(120),
  claimantEmail: z.string().email(),
  claimantUrl: z.string().url().optional().or(z.literal("")),
  details: z.string().min(10).max(2000),
});

export const submitThemeMaintainerClaim = createServerAction()
  .input(submitThemeClaimSchema)
  .handler(async ({ input }) => {
    const ip = await getIP();
    const rateLimitKey = `theme-claim:${ip}`;

    if (await isRateLimited(rateLimitKey, "claim")) {
      throw new Error("Too many requests. Please try again later");
    }

    const session = await auth.api.getSession({ headers: await headers() });

    const theme = await db.theme.findUnique({
      where: { id: input.themeId },
      select: { id: true, slug: true, name: true },
    });

    if (!theme) {
      throw new Error("Theme not found");
    }

    return db.$transaction(async (tx) => {
      const hasMaintainer = await tx.themeMaintainer.count({
        where: { themeId: theme.id },
      });

      if (hasMaintainer > 0) {
        throw new Error("This theme already has maintainer(s)");
      }

      const existingClaim = await tx.themeMaintainerClaim.findFirst({
        where: {
          themeId: theme.id,
          status: ThemeMaintainerClaimStatus.Pending,
          OR: [
            { claimantEmail: input.claimantEmail },
            ...(session?.user?.id ? [{ requesterId: session.user.id }] : []),
          ],
        },
        select: { id: true },
      });

      if (existingClaim) {
        throw new Error("You already have a pending claim for this theme");
      }

      return tx.themeMaintainerClaim.create({
        data: {
          themeId: theme.id,
          claimantName: input.claimantName,
          claimantEmail: input.claimantEmail,
          claimantUrl: input.claimantUrl || null,
          details: input.details,
          requesterId: session?.user?.id || null,
        },
      });
    });
  });

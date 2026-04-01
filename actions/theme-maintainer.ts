"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { userProcedure } from "~/lib/safe-actions";
import { db } from "~/services/db";

const updateMaintainedThemeSchema = z.object({
  themeId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  websiteUrl: z.string().trim().url().optional().or(z.literal("")),
  repositoryUrl: z.string().trim().url().optional().or(z.literal("")),
  guidelines: z.string().trim().max(50_000).optional().or(z.literal("")),
  license: z.string().trim().max(120).optional().or(z.literal("")),
});

const toNullableString = (value?: string) => {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const updateMaintainedTheme = userProcedure
  .createServerAction()
  .input(updateMaintainedThemeSchema)
  .handler(async ({ input, ctx: { user } }) => {
    const {
      themeId,
      name,
      description,
      websiteUrl,
      repositoryUrl,
      guidelines,
      license,
    } = input;

    if (user.role !== "admin") {
      const isMaintainer = await db.themeMaintainer.findUnique({
        where: {
          userId_themeId: {
            userId: user.id,
            themeId,
          },
        },
        select: { id: true },
      });

      if (!isMaintainer) {
        throw new Error("Only maintainers of this theme can edit it.");
      }
    }

    const theme = await db.theme.update({
      where: { id: themeId },
      data: {
        name: name.trim(),
        description: toNullableString(description),
        websiteUrl: toNullableString(websiteUrl),
        repositoryUrl: toNullableString(repositoryUrl),
        guidelines: toNullableString(guidelines),
        license: toNullableString(license),
      },
      select: { slug: true },
    });

    revalidatePath("/dashboard");
    revalidatePath(`/themes/${theme.slug}`);
    revalidateTag("themes", "max");
    revalidateTag(`theme-${theme.slug}`, "max");

    return { success: true };
  });

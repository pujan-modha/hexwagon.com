"use server";

import { slugify } from "@primoui/utils";
import { PortStatus, Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { after } from "next/server";
import { subscribeToNewsletter } from "~/actions/subscribe";
import {
  notifySubmitterOfPortApproved,
  notifySubmitterOfPortSubmitted,
} from "~/lib/notifications";
import { isRateLimited } from "~/lib/rate-limiter";
import { userProcedure } from "~/lib/safe-actions";
import { submitPortSchema } from "~/server/web/shared/schema";
import { db } from "~/services/db";

/**
 * Submit a port to the database
 */
export const submitPort = userProcedure
  .createServerAction()
  .input(submitPortSchema)
  .handler(async ({ input: { newsletterOptIn, ...data }, ctx: { user } }) => {
    const submitterName = user.name?.trim() || null;
    const submitterEmail = user.email?.trim() || null;

    const rateLimitKey = `submission:${user.id}`;
    if (await isRateLimited(rateLimitKey, "submission")) {
      throw new Error("Too many submissions. Please try again later.");
    }

    const isThemeMaintainer =
      user.role === "admin" ||
      Boolean(
        await db.themeMaintainer.findUnique({
          where: {
            userId_themeId: {
              userId: user.id,
              themeId: data.themeId,
            },
          },
          select: { id: true },
        }),
      );

    if (newsletterOptIn && submitterEmail) {
      await subscribeToNewsletter({
        value: submitterEmail,
        utm_medium: "submit_form",
        send_welcome_email: false,
      });
    }

    // Check for duplicate submission (same user + theme + platform with pending status)
    const existingPort = await db.port.findFirst({
      where: {
        themeId: data.themeId,
        platformId: data.platformId,
        authorId: user.id,
        status: { in: ["Draft", "PendingEdit"] },
      },
    });

    if (existingPort) {
      throw new Error(
        "You already have a pending submission for this theme+platform.",
      );
    }

    const authorId = user.id;
    const baseSlug = slugify(data.name);

    const port = await (async () => {
      const maxSlugAttempts = 25;

      for (let attempt = 0; attempt < maxSlugAttempts; attempt++) {
        const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;

        try {
          return await db.port.create({
            data: {
              ...data,
              submitterName,
              submitterEmail,
              slug,
              authorId,
              ...(isThemeMaintainer
                ? {
                    status: PortStatus.Published,
                    publishedAt: new Date(),
                  }
                : {}),
            },
          });
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002" &&
            Array.isArray(error.meta?.target) &&
            error.meta.target.includes("slug")
          ) {
            continue;
          }

          throw error;
        }
      }

      throw new Error(
        "Could not reserve a unique slug. Please try submitting again.",
      );
    })();

    if (isThemeMaintainer) {
      revalidateTag("ports", "max");
      revalidateTag(`port-${port.slug}`, "max");
      after(async () => await notifySubmitterOfPortApproved(port));
    } else {
      after(async () => await notifySubmitterOfPortSubmitted(port));
    }

    return port;
  });

export const submitTool = submitPort;

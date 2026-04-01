"use server";

import { ReportType } from "@prisma/client";
import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { createServerAction } from "zsa";
import { config } from "~/config";
import EmailReportAcknowledged from "~/emails/report-acknowledged";
import { auth } from "~/lib/auth";
import { sendEmail } from "~/lib/email";
import { getIP, isRateLimited } from "~/lib/rate-limiter";
import { userProcedure } from "~/lib/safe-actions";
import { feedbackSchema, reportSchema } from "~/server/web/shared/schema";
import { db } from "~/services/db";
import { tryCatch } from "~/utils/helpers";

const queueReportAcknowledgment = (to: string, entityType: string) => {
  after(async () => {
    await sendEmail({
      to,
      subject: `Your report has been received - ${config.site.name}`,
      react: EmailReportAcknowledged({ to, entityType }),
    });
  });
};

export const reportPort = userProcedure
  .createServerAction()
  .input(reportSchema.extend({ portId: z.string() }))
  .handler(async ({ input: { portId, type, message }, ctx: { user } }) => {
    const ip = await getIP();
    const rateLimitKey = `report:${ip}`;

    if (await isRateLimited(rateLimitKey, "report")) {
      throw new Error("Too many requests. Please try again later.");
    }

    const result = await tryCatch(
      db.report.create({
        data: {
          type,
          message,
          port: { connect: { id: portId } },
          user: { connect: { id: user.id } },
        },
      }),
    );

    if (result.error) {
      console.error("Failed to report port:", result.error);
      return {
        success: false,
        error: "Failed to report port. Please try again later.",
      };
    }

    queueReportAcknowledgment(user.email, "port");

    return { success: true };
  });

export const reportTheme = userProcedure
  .createServerAction()
  .input(reportSchema.extend({ themeId: z.string() }))
  .handler(async ({ input: { themeId, type, message }, ctx: { user } }) => {
    const ip = await getIP();
    const rateLimitKey = `report:${ip}`;

    if (await isRateLimited(rateLimitKey, "report")) {
      throw new Error("Too many requests. Please try again later.");
    }

    const result = await tryCatch(
      db.report.create({
        data: {
          type,
          message,
          theme: { connect: { id: themeId } },
          user: { connect: { id: user.id } },
        },
      }),
    );

    if (result.error) {
      console.error("Failed to report theme:", result.error);
      return {
        success: false,
        error: "Failed to report theme. Please try again later.",
      };
    }

    queueReportAcknowledgment(user.email, "theme");

    return { success: true };
  });

export const reportPlatform = userProcedure
  .createServerAction()
  .input(reportSchema.extend({ platformId: z.string() }))
  .handler(async ({ input: { platformId, type, message }, ctx: { user } }) => {
    const ip = await getIP();
    const rateLimitKey = `report:${ip}`;

    if (await isRateLimited(rateLimitKey, "report")) {
      throw new Error("Too many requests. Please try again later.");
    }

    const result = await tryCatch(
      db.report.create({
        data: {
          type,
          message,
          platform: { connect: { id: platformId } },
          user: { connect: { id: user.id } },
        },
      }),
    );

    if (result.error) {
      console.error("Failed to report platform:", result.error);
      return {
        success: false,
        error: "Failed to report platform. Please try again later.",
      };
    }

    queueReportAcknowledgment(user.email, "platform");

    return { success: true };
  });

export const reportComment = userProcedure
  .createServerAction()
  .input(reportSchema.extend({ commentId: z.string() }))
  .handler(async ({ input: { commentId, type, message }, ctx: { user } }) => {
    const ip = await getIP();
    const rateLimitKey = `report:${ip}`;

    if (await isRateLimited(rateLimitKey, "report")) {
      throw new Error("Too many requests. Please try again later.");
    }

    const result = await tryCatch(
      db.report.create({
        data: {
          type,
          message,
          comment: { connect: { id: commentId } },
          user: { connect: { id: user.id } },
        },
      }),
    );

    if (result.error) {
      console.error("Failed to report comment:", result.error);
      return {
        success: false,
        error: "Failed to report comment. Please try again later.",
      };
    }

    queueReportAcknowledgment(user.email, "comment");

    return { success: true };
  });

export const reportFeedback = createServerAction()
  .input(feedbackSchema)
  .handler(async ({ input: { message } }) => {
    const session = await auth.api.getSession({ headers: await headers() });
    const ip = await getIP();
    const rateLimitKey = `report:${ip}`;

    if (await isRateLimited(rateLimitKey, "report")) {
      throw new Error("Too many requests. Please try again later.");
    }

    const result = await tryCatch(
      db.report.create({
        data: {
          type: ReportType.Other,
          message,
          userId: session?.user.id,
        },
      }),
    );

    if (result.error) {
      console.error("Failed to send feedback:", result.error);
      return {
        success: false,
        error: "Failed to send feedback. Please try again later.",
      };
    }

    if (session?.user.email) {
      queueReportAcknowledgment(session.user.email, "feedback");
    }

    return { success: true };
  });

/**
 * @deprecated Use reportPort instead.
 */
export const reportTool = reportPort;

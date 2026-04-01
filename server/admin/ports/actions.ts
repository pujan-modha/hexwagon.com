"use server";

import { slugify } from "@primoui/utils";
import { PortStatus } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { removeS3Directories } from "~/lib/media";
import {
  notifySubmitterOfPortApproved,
  notifySubmitterOfPortRejected,
  notifySubmitterOfPortScheduled,
} from "~/lib/notifications";
import { adminProcedure, userProcedure } from "~/lib/safe-actions";
import { portSchema } from "~/server/admin/ports/schema";
import { db } from "~/services/db";

export const upsertPort = adminProcedure
  .createServerAction()
  .input(portSchema)
  .handler(async ({ input: { id, themeId, platformId, ...input } }) => {
    const existingPort = id
      ? await db.port.findUnique({ where: { id } })
      : null;

    const port = id
      ? await db.port.update({
          where: { id },
          data: {
            ...input,
            slug:
              input.slug || slugify(input.name ?? `${themeId}-${platformId}`),
            themeId: themeId ?? existingPort?.themeId,
            platformId: platformId ?? existingPort?.platformId,
          },
        })
      : await db.port.create({
          data: {
            ...input,
            slug:
              input.slug || slugify(input.name ?? `${themeId}-${platformId}`),
            themeId: themeId!,
            platformId: platformId!,
          },
        });

    revalidateTag("ports", "max");
    revalidateTag(`port-${port.slug}`, "max");

    if (port.status === PortStatus.Scheduled) {
      revalidateTag("schedule", "max");
    }

    if (!existingPort || existingPort.status !== port.status) {
      after(async () => await notifySubmitterOfPortApproved(port));
      after(async () => await notifySubmitterOfPortScheduled(port));
    }

    const hasRejectionReason = Boolean(port.rejectionReason?.trim());
    const hadRejectionReason = Boolean(existingPort?.rejectionReason?.trim());
    const rejectionReasonChanged =
      (existingPort?.rejectionReason ?? "") !== (port.rejectionReason ?? "");
    const isRejectedState =
      port.status !== PortStatus.Published &&
      port.status !== PortStatus.Scheduled;

    if (
      existingPort &&
      isRejectedState &&
      hasRejectionReason &&
      (!hadRejectionReason || rejectionReasonChanged)
    ) {
      after(async () => await notifySubmitterOfPortRejected(port));
    }

    return port;
  });

export const deletePorts = adminProcedure
  .createServerAction()
  .input(z.object({ ids: z.array(z.string()) }))
  .handler(async ({ input: { ids } }) => {
    const ports = await db.port.findMany({
      where: { id: { in: ids } },
      select: { slug: true },
    });

    await db.port.deleteMany({
      where: { id: { in: ids } },
    });

    revalidatePath("/admin/ports");
    revalidateTag("ports", "max");

    after(async () => {
      await removeS3Directories(ports.map((port) => `ports/${port.slug}`));
    });

    return true;
  });

export const setOfficialPort = userProcedure
  .createServerAction()
  .input(z.object({ portId: z.string() }))
  .handler(async ({ input: { portId }, ctx: { user } }) => {
    const port = await db.port.findUniqueOrThrow({
      where: { id: portId },
      select: { themeId: true, platformId: true, slug: true },
    });

    if (user.role !== "admin") {
      const isThemeMaintainer = await db.themeMaintainer.findUnique({
        where: {
          userId_themeId: {
            userId: user.id,
            themeId: port.themeId,
          },
        },
        select: { id: true },
      });

      if (!isThemeMaintainer) {
        throw new Error(
          "Only admins or maintainers of this theme can mark official ports",
        );
      }
    }

    await db.port.updateMany({
      where: {
        themeId: port.themeId,
        platformId: port.platformId,
        isOfficial: true,
      },
      data: { isOfficial: false },
    });

    const updatedPort = await db.port.update({
      where: { id: portId },
      data: { isOfficial: true },
    });

    revalidateTag("ports", "max");
    revalidateTag(`port-${updatedPort.slug}`, "max");

    return updatedPort;
  });

import { PortStatus } from "@prisma/client";
import { db } from "~/services/db";

export const findMaintainedThemes = async (userId: string) => {
  const maintainedThemes = await db.themeMaintainer.findMany({
    where: { userId },
    orderBy: { assignedAt: "asc" },
    select: {
      theme: {
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          websiteUrl: true,
          repositoryUrl: true,
          guidelines: true,
          license: true,
          faviconUrl: true,
          _count: {
            select: {
              maintainers: true,
              ports: { where: { status: PortStatus.Published } },
            },
          },
          ports: {
            where: { status: PortStatus.Published },
            select: {
              id: true,
              slug: true,
              name: true,
              isOfficial: true,
              platform: {
                select: {
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return maintainedThemes.map((maintainer) => maintainer.theme);
};

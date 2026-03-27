import { db } from "~/services/db";
import { adAdminPayload, type AdAdminMany } from "./payloads";
import type { AdStatusValue } from "~/utils/ads";

export const findAds = async ({
  status,
}: { status?: AdStatusValue | "All" } = {}): Promise<AdAdminMany[]> => {
  return db.ad.findMany({
    where: status && status !== "All" ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    select: adAdminPayload,
  });
};

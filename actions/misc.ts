"use server";

import { indexPorts, indexThemes, indexPlatforms } from "~/lib/indexing";
import { adminProcedure } from "~/lib/safe-actions";

export const indexAllData = adminProcedure
  .createServerAction()
  .handler(async () => {
    await Promise.all([indexPorts({}), indexThemes({}), indexPlatforms({})]);
  });

export const recalculatePricesData = adminProcedure
  .createServerAction()
  .handler(async () => {
    return {
      success: true,
      message: "Price recalculation is no longer required for ports.",
    };
  });

import { millisecondsInHour } from "date-fns/constants";
import { revalidateTag } from "next/cache";
import { adsConfig } from "~/config/ads";
import { config } from "~/config";
import { adStatus } from "~/utils/ads";
import { inngest } from "~/services/inngest";

export const cancelUnpaidAds = inngest.createFunction(
  { id: `${config.site.slug}.cancel-unpaid-ads` },
  { cron: "TZ=Europe/Warsaw 0 * * * *" }, // Every hour

  async ({ step, db, logger }) => {
    const paymentDeadline = new Date(
      Date.now() - adsConfig.paymentDeadlineHours * millisecondsInHour,
    );

    const { count } = await step.run("cancel-expired-unpaid-ads", async () => {
      return db.ad.updateMany({
        where: {
          status: adStatus.Approved,
          paidAt: null,
          cancelledAt: null,
          approvedAt: { not: null, lte: paymentDeadline },
        },
        data: {
          status: adStatus.Cancelled,
          cancelledAt: new Date(),
          approvedAt: null,
          rejectedAt: null,
          adminNote: "Auto-cancelled: payment deadline exceeded",
        },
      });
    });

    if (count > 0) {
      logger.info("Auto-cancelled unpaid ads after payment deadline", {
        count,
        paymentDeadlineHours: adsConfig.paymentDeadlineHours,
      });

      await step.run("revalidate-ads-cache", async () => {
        revalidateTag("ads", "max");
      });
    }

    await step.run("disconnect-from-db", async () => {
      return db.$disconnect();
    });
  },
);

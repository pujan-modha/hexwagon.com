import { AdStatus } from "@prisma/client";
import { Badge } from "~/components/common/badge";
import { Button } from "~/components/common/button";
import { Card } from "~/components/common/card";
import { Link } from "~/components/common/link";
import { Note } from "~/components/common/note";
import type { UserDashboardAd } from "~/server/web/ads/queries";

type DashboardAdsSectionProps = {
  ads: UserDashboardAd[];
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const formatDateValue = (value: Date | null) =>
  value ? dateFormatter.format(value) : "-";
const formatMoneyFromCents = (value: number | null) =>
  value === null ? "-" : usdFormatter.format(value / 100);

const getReviewStatus = (ad: UserDashboardAd, now: Date) => {
  if (ad.status === AdStatus.Rejected) {
    return { label: "Rejected", variant: "danger" as const };
  }

  if (ad.status === AdStatus.Cancelled) {
    return { label: "Cancelled", variant: "soft" as const };
  }

  if (!ad.paidAt) {
    return { label: "Payment pending", variant: "warning" as const };
  }

  if (ad.status === AdStatus.Pending) {
    return { label: "Under review", variant: "info" as const };
  }

  if (ad.status === AdStatus.Approved && ad.startsAt > now) {
    return { label: "Approved (scheduled)", variant: "success" as const };
  }

  if (ad.status === AdStatus.Approved && ad.endsAt <= now) {
    return { label: "Completed", variant: "soft" as const };
  }

  return { label: "Live", variant: "success" as const };
};

const getPaymentStatus = (ad: UserDashboardAd) => {
  if (ad.refundedAt) {
    return { label: "Refunded", variant: "soft" as const };
  }

  if (ad.paidAt) {
    return {
      label: `Paid on ${formatDateValue(ad.paidAt)}`,
      variant: "success" as const,
    };
  }

  if (ad.stripeCheckoutSessionId) {
    return { label: "Checkout started", variant: "warning" as const };
  }

  return { label: "Unpaid", variant: "warning" as const };
};

const summarizeTargets = (items: Array<{ name: string }>) => {
  if (!items.length) {
    return "All";
  }

  const names = items.slice(0, 3).map((item) => item.name);

  if (items.length <= 3) {
    return names.join(", ");
  }

  return `${names.join(", ")} +${items.length - 3} more`;
};

export const DashboardAdsSection = ({ ads }: DashboardAdsSectionProps) => {
  return (
    <section className="mt-10 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Your ads</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Track campaign review status, billing, and schedule details.
          </p>
        </div>

        <Button size="sm" asChild>
          <Link href="/advertise">Create ad</Link>
        </Button>
      </div>

      {ads.length > 0 ? (
        <div className="grid gap-3">
          {ads.map((ad) => {
            const now = new Date();
            const reviewStatus = getReviewStatus(ad, now);
            const paymentStatus = getPaymentStatus(ad);

            return (
              <Card key={ad.id} className="gap-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold leading-tight">
                      {ad.name}
                    </h3>
                    <a
                      href={ad.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary underline-offset-2 hover:underline"
                    >
                      {ad.websiteUrl}
                    </a>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={reviewStatus.variant}>
                      {reviewStatus.label}
                    </Badge>
                    <Badge variant={paymentStatus.variant}>
                      {paymentStatus.label}
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
                  <p>
                    <span className="font-medium text-foreground">
                      Placement:
                    </span>{" "}
                    {ad.type}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">
                      Billing:
                    </span>{" "}
                    {ad.billingCycle ?? "-"}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Total:</span>{" "}
                    {formatMoneyFromCents(ad.priceCents)}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">
                      Schedule:
                    </span>{" "}
                    {formatDateValue(ad.startsAt)} -{" "}
                    {formatDateValue(ad.endsAt)}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Themes:</span>{" "}
                    {summarizeTargets(ad.targetThemes)}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">
                      Platforms:
                    </span>{" "}
                    {summarizeTargets(ad.targetPlatforms)}
                  </p>
                </div>

                <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                  <p>Created: {formatDateValue(ad.createdAt)}</p>
                  <p>Last updated: {formatDateValue(ad.updatedAt)}</p>
                </div>

                {ad.adminNote ? (
                  <Note className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
                    Admin note: {ad.adminNote}
                  </Note>
                ) : null}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <p className="text-sm text-muted-foreground">
            No ads yet. Create your first campaign to start promoting your
            project.
          </p>
        </Card>
      )}
    </section>
  );
};

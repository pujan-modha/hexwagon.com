import type { Ad } from "@prisma/client";
import { Text } from "@react-email/components";
import { config } from "~/config";
import {
  EmailWrapper,
  type EmailWrapperProps,
} from "~/emails/components/wrapper";

type EmailProps = EmailWrapperProps & {
  ad: Ad;
};

const EmailAdRejected = ({ ad, ...props }: EmailProps) => {
  return (
    <EmailWrapper signature {...props}>
      <Text>Hey {ad.name}!</Text>

      <Text>
        Thanks for booking an ad on {config.site.name}. Unfortunately, it was
        not approved.
      </Text>

      {ad.adminNote && <Text>Note from the team: {ad.adminNote}</Text>}

      {ad.refundedAt ? (
        <Text>
          A full refund has been issued
          {typeof ad.refundAmountCents === "number"
            ? ` (${(ad.refundAmountCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })})`
            : ""}
          .
        </Text>
      ) : ad.paidAt ? (
        <Text>
          Because this campaign was paid, a full refund will be issued back to
          your original payment method.
        </Text>
      ) : null}

      <Text>If you think this was a mistake, just reply to this email.</Text>
    </EmailWrapper>
  );
};

export default EmailAdRejected;

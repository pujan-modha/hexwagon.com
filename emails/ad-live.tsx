import type { Ad } from "@prisma/client";
import { Text } from "@react-email/components";
import { config } from "~/config";
import { EmailButton } from "~/emails/components/button";
import {
  EmailWrapper,
  type EmailWrapperProps,
} from "~/emails/components/wrapper";

type EmailProps = EmailWrapperProps & {
  ad: Ad;
};

const EmailAdLive = ({ ad, ...props }: EmailProps) => {
  return (
    <EmailWrapper signature {...props}>
      <Text>Hey {ad.name}!</Text>

      <Text>
        Your ad for <strong>{ad.websiteUrl}</strong> is now confirmed on{" "}
        {config.site.name}.
      </Text>

      <Text>
        It is scheduled for {ad.startsAt.toLocaleDateString()} -{" "}
        {ad.endsAt.toLocaleDateString()}.
      </Text>

      {typeof ad.priceCents === "number" && (
        <Text>
          Total paid:{" "}
          {(ad.priceCents / 100).toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
          })}
        </Text>
      )}

      <EmailButton href={`${config.site.url}/advertise`}>
        Manage your campaign
      </EmailButton>
    </EmailWrapper>
  );
};

export default EmailAdLive;

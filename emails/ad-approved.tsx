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

const EmailAdApproved = ({ ad, ...props }: EmailProps) => {
  return (
    <EmailWrapper signature {...props}>
      <Text>Hey {ad.name}!</Text>

      <Text>
        Your ad for <strong>{ad.websiteUrl}</strong> has been approved on{" "}
        {config.site.name}.
      </Text>

      <Text>
        It is now queued for the booked dates starting{" "}
        {ad.startsAt.toLocaleDateString()}.
      </Text>

      <EmailButton href={`${config.site.url}/advertise`}>
        View advertising options
      </EmailButton>
    </EmailWrapper>
  );
};

export default EmailAdApproved;

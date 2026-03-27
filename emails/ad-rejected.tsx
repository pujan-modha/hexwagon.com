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

      <Text>If you think this was a mistake, just reply to this email.</Text>
    </EmailWrapper>
  );
};

export default EmailAdRejected;

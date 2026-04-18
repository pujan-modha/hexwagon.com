import { getUrlHostname } from "@primoui/utils"
import { Link, Text } from "@react-email/components"
import { config } from "~/config"
import { EmailWrapper, type EmailWrapperProps } from "~/emails/components/wrapper"

type EmailProps = EmailWrapperProps & {
  name?: string
}

const EmailWelcome = ({ name = "there", ...props }: EmailProps) => {
  const preview = `Welcome to ${config.site.name} – a directory of theme ports for every platform.`

  return (
    <EmailWrapper preview={preview} signature {...props}>
      <Text>Hi {name},</Text>

      <Text>{preview}</Text>

      <Text>
        {config.site.name} is more than just a directory - it's a community. Discover new theme
        ports, browse platform support, and share your favorite projects with other builders.
      </Text>

      <Text>Here's what you can do in {config.site.name}:</Text>

      <ul>
        <li>
          <Text className="m-0">
            <Link href={`${config.site.url}/themes`} className="underline font-medium">
              Explore Theme Ports
            </Link>{" "}
            – Browse existing theme ports curated by the community.
          </Text>
        </li>

        <li>
          <Text className="m-0">
            <Link href={`${config.site.url}/submit`} className="underline font-medium">
              Submit a Port
            </Link>{" "}
            – Get your theme port in front of people looking for new platform support. It’s 100%
            free to submit.
          </Text>
        </li>

        <li>
          <Text className="m-0">
            <Link href={`${config.site.url}/advertise`} className="underline font-medium">
              Advertise on HexWagon
            </Link>{" "}
            – Choose one of the available options and promote your business or product on our
            website.
          </Text>
        </li>
      </ul>

      <Text>
        Jump in and start exploring:{" "}
        <Link href={config.site.url} className="underline font-medium">
          {getUrlHostname(config.site.url)}
        </Link>
      </Text>
    </EmailWrapper>
  )
}

export default EmailWelcome

import { formatNumber } from "@primoui/utils"
import type { ComponentProps } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/common/dropdown-menu"
import { H5, H6 } from "~/components/common/heading"
import { Icon } from "~/components/common/icon"
import { Stack } from "~/components/common/stack"
import { Tooltip } from "~/components/common/tooltip"
import { BuiltWith } from "~/components/web/built-with"
import { ExternalLink } from "~/components/web/external-link"
import { NewsletterForm } from "~/components/web/newsletter-form"
import { NavLink } from "~/components/web/ui/nav-link"
import { config } from "~/config"
import { cx } from "~/utils/cva"

const footerLinkClassName =
  "group flex items-center gap-2 p-0.5 -m-0.5 cursor-pointer disabled:opacity-50 text-muted-foreground hover:text-foreground"

type FooterProps = ComponentProps<"div"> & {
  hideNewsletter?: boolean
}

export const Footer = ({ children, className, hideNewsletter, ...props }: FooterProps) => {
  return (
    <footer
      className="flex flex-col gap-y-8 mt-auto pt-8 border-t border-foreground/10 md:pt-10 lg:pt-12"
      {...props}
    >
      <div
        className={cx("grid grid-cols-3 gap-y-8 gap-x-4 md:gap-x-6 md:grid-cols-16", className)}
        {...props}
      >
        <Stack
          direction="column"
          className="flex flex-col items-start gap-4 col-span-full md:col-span-6"
        >
          <Stack size="lg" direction="column" className="min-w-0 max-w-64">
            <H5 as="strong" className="px-0.5 font-medium">
              Subscribe to our newsletter
            </H5>

            <p className="-mt-2 px-0.5 text-xs text-muted-foreground first:mt-0">
              Join {formatNumber(config.stats.subscribers, "standard")}+ other members and get
              updates on new theme ports.
            </p>

            <NewsletterForm medium="footer_form" />
          </Stack>

          <Stack className="text-xl opacity-75">
            <DropdownMenu modal={false}>
              <Tooltip tooltip="RSS Feeds">
                <DropdownMenuTrigger id="footer-rss-menu-trigger" aria-label="RSS Feeds">
                  <Icon name="lucide/rss" className="text-muted-foreground hover:text-foreground" />
                </DropdownMenuTrigger>
              </Tooltip>

              <DropdownMenuContent align="start" side="top">
                {config.links.feeds.map(({ url, title }) => (
                  <DropdownMenuItem key={url} asChild>
                    <ExternalLink href={url} className={footerLinkClassName}>
                      RSS &raquo; {title}
                    </ExternalLink>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip tooltip="Contact us">
              <ExternalLink href={`mailto:${config.site.email}`} className={footerLinkClassName}>
                <Icon name="lucide/at-sign" />
              </ExternalLink>
            </Tooltip>

            <Tooltip tooltip="Follow us on X/Twitter">
              <ExternalLink href={config.links.twitter} className={footerLinkClassName}>
                <Icon name="tabler/brand-x" />
              </ExternalLink>
            </Tooltip>

            {/* <Tooltip tooltip="Join us on Discord">
              <ExternalLink
                href={config.links.discord}
                className={footerLinkClassName}
              >
                <Icon name="custom/brand-discord" />
              </ExternalLink>
            </Tooltip>

            <Tooltip tooltip="Join our community on Reddit">
              <ExternalLink
                href={config.links.reddit}
                className={footerLinkClassName}
              >
                <Icon name="tabler/brand-reddit" />
              </ExternalLink>
            </Tooltip> */}
          </Stack>
        </Stack>

        <Stack direction="column" className="text-sm md:col-span-3 md:col-start-14">
          <H6 as="strong">Quick Links</H6>

          <NavLink href="/about">About Us</NavLink>
          <NavLink href="/blog">Blog</NavLink>
          <NavLink href="/advertise">Advertise</NavLink>
          <NavLink href="/privacy-policy">Privacy Policy</NavLink>
          <NavLink href="/terms-of-service">Terms of Service</NavLink>
          <NavLink href="/submit">Submit a Port</NavLink>
        </Stack>
      </div>

      <div className="flex flex-row flex-wrap items-end justify-between gap-x-4 gap-y-2 w-full text-sm text-muted-foreground **:[&[href]]:font-medium **:[&[href]]:text-foreground **:[&[href]]:hover:text-secondary-foreground">
        {/* <BuiltWith medium="footer" /> */}

        <p>Made with 🍕 and 🥤. Website may contain affiliate links.</p>
      </div>

      {children}
    </footer>
  )
}

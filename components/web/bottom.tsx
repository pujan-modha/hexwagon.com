import type { ComponentProps } from "react"
import { H6 } from "~/components/common/heading"
import { Stack } from "~/components/common/stack"
import { Container } from "~/components/web/ui/container"
import { NavLink } from "~/components/web/ui/nav-link"
import { Tile, TileCaption, TileDivider } from "~/components/web/ui/tile"
import { siteConfig } from "~/config/site"
import { findThemes } from "~/server/web/themes/queries"
import { cx } from "~/utils/cva"

export const Bottom = async ({ className, ...props }: ComponentProps<"div">) => {
  const themes = await findThemes({
    where: { websiteUrl: { startsWith: siteConfig.affiliateUrl } },
    orderBy: { ports: { _count: "desc" } },
    take: 12,
  })

  if (!themes?.length) {
    return null
  }

  return (
    <Container>
      <div
        className={cx(
          "flex flex-col gap-y-6 py-8 border-t border-foreground/10 md:py-10 lg:py-12",
          className,
        )}
        {...props}
      >
        {!!themes?.length && (
          <Stack className="gap-x-4 text-sm">
            <H6 as="strong">Popular Themes:</H6>

            <div className="grid grid-cols-2xs gap-x-4 gap-y-2 w-full sm:grid-cols-xs md:grid-cols-sm">
              {themes.map(theme => (
                <Tile key={theme.slug} className="gap-2" asChild>
                  <NavLink href={`/themes/${theme.slug}`}>
                    <span className="truncate">{theme.name}</span>

                    <TileDivider />

                    <TileCaption className="max-sm:hidden">{theme._count.ports}</TileCaption>
                  </NavLink>
                </Tile>
              ))}
            </div>
          </Stack>
        )}
      </div>
    </Container>
  )
}

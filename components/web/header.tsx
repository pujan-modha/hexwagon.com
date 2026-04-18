"use client"

import { usePathname } from "next/navigation"
import { type ComponentProps, useEffect, useState } from "react"
import { Button } from "~/components/common/button"
import { Icon } from "~/components/common/icon"
import { Link } from "~/components/common/link"
import { Stack } from "~/components/common/stack"
import { Container } from "~/components/web/ui/container"
import { Hamburger } from "~/components/web/ui/hamburger"
import { Logo } from "~/components/web/ui/logo"
import { NavLink, navLinkVariants } from "~/components/web/ui/nav-link"
import { UserMenu } from "~/components/web/user-menu"
import { useSearch } from "~/contexts/search-context"
import type { auth } from "~/lib/auth"
import { cx } from "~/utils/cva"

type HeaderProps = ComponentProps<"div"> & {
  session: typeof auth.$Infer.Session | null
}

const Header = ({ children, className, session, ...props }: HeaderProps) => {
  const pathname = usePathname()
  const search = useSearch()
  const [isNavOpen, setNavOpen] = useState(false)

  // Close the mobile navigation when the user presses the "Escape" key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false)
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  useEffect(() => {
    setNavOpen(false)
  }, [pathname])

  return (
    <div
      className={cx("fixed top-(--header-top) inset-x-0 z-50 bg-background", className)}
      id="header"
      role="banner"
      data-state={isNavOpen ? "open" : "close"}
      {...props}
    >
      <Container>
        <div className="flex items-center py-3.5 gap-4 text-sm h-(--header-height) md:gap-6">
          <Stack size="sm" wrap={false} className="mr-auto">
            <button
              type="button"
              onClick={() => setNavOpen(!isNavOpen)}
              className="block -m-1 -ml-1.5 lg:hidden"
            >
              <Hamburger className="size-7" />
            </button>

            <Logo />
          </Stack>

          <nav className="flex flex-wrap gap-4 max-md:hidden">
            <NavLink href="/themes">Themes</NavLink>
            <NavLink href="/platforms">Platforms</NavLink>
            <NavLink href="/configs">Configs</NavLink>
            <NavLink href="/advertise">Advertise</NavLink>
          </nav>

          <Stack size="sm" wrap={false}>
            <Button
              size="sm"
              variant="ghost"
              aria-label="Search"
              className="p-1"
              onClick={search.open}
            >
              <Icon name="lucide/search" className="size-4" />
            </Button>

            <Button size="sm" variant="secondary" asChild>
              <Link href="/submit">Submit</Link>
            </Button>

            <UserMenu session={session} />
          </Stack>
        </div>

        <nav
          className={cx(
            "absolute top-full inset-x-0 h-[calc(100dvh-var(--header-top)-var(--header-height))] -mt-px py-4 px-6 grid grid-cols-2 place-items-start place-content-start gap-x-4 gap-y-6 bg-background/90 backdrop-blur-lg transition-opacity lg:hidden",
            isNavOpen ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
        >
          <NavLink href="/themes" className="text-base">
            Themes
          </NavLink>
          <NavLink href="/platforms" className="text-base">
            Platforms
          </NavLink>
          <NavLink href="/configs" className="text-base">
            Configs
          </NavLink>
          <NavLink href="/submit" className="text-base">
            Submit
          </NavLink>
          <NavLink href="/advertise" className="text-base">
            Advertise
          </NavLink>
          <NavLink href="/about" className="text-base">
            About
          </NavLink>
        </nav>
      </Container>
    </div>
  )
}

const HeaderBackdrop = () => {
  return (
    <div className="fixed top-(--header-offset) inset-x-0 z-40 h-8 pointer-events-none bg-linear-to-b from-background to-transparent" />
  )
}

export { Header, HeaderBackdrop, type HeaderProps }

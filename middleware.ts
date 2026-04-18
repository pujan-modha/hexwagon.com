import { getSessionCookie } from "better-auth/cookies"
import { type NextRequest, NextResponse } from "next/server"

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
}

export default async function (req: NextRequest) {
  const { pathname, search } = req.nextUrl
  const sessionCookie = getSessionCookie(req)
  const forwardedHeaders = new Headers(req.headers)
  forwardedHeaders.set("x-pathname", pathname)

  const nextWithPathname = () =>
    NextResponse.next({
      request: {
        headers: forwardedHeaders,
      },
    })

  // If the user is logged in and tries to access the auth page, redirect to the home page
  if (sessionCookie && pathname.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  // If the user is not logged in and tries to access the authed pages, redirect to the login page
  if (
    !sessionCookie &&
    (pathname.startsWith("/dashboard") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/submit") ||
      pathname.startsWith("/suggest"))
  ) {
    return NextResponse.redirect(new URL(`/auth/login?next=${pathname}${search}`, req.url))
  }

  return nextWithPathname()
}

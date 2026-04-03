"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { useEffect, useRef } from "react"

export const PlausiblePageview = () => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isFirstRender = useRef(true)

  useEffect(() => {
    // The plausible script records the initial load; only track client-side transitions here.
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (typeof window !== "undefined" && typeof window.plausible === "function") {
      window.plausible("pageview")
    }
  }, [pathname, searchParams])

  return null
}

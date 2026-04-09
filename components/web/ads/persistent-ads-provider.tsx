"use client"

import {
  type PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

type PersistentAdSlot = "Banner" | "Footer"

type PersistentAdsContextValue = {
  bannerAdId?: string
  footerAdId?: string
  setPersistentAdId: (slot: PersistentAdSlot, adId?: string) => void
}

const PersistentAdsContext = createContext<PersistentAdsContextValue | null>(null)

export const PersistentAdsProvider = ({ children }: PropsWithChildren) => {
  const [bannerAdId, setBannerAdId] = useState<string>()
  const [footerAdId, setFooterAdId] = useState<string>()

  const value = useMemo<PersistentAdsContextValue>(
    () => ({
      bannerAdId,
      footerAdId,
      setPersistentAdId: (slot, adId) => {
        if (slot === "Banner") {
          setBannerAdId(adId)
          return
        }

        setFooterAdId(adId)
      },
    }),
    [bannerAdId, footerAdId],
  )

  return <PersistentAdsContext.Provider value={value}>{children}</PersistentAdsContext.Provider>
}

const usePersistentAdsContext = () => {
  const context = useContext(PersistentAdsContext)

  if (!context) {
    throw new Error("usePersistentAdsContext must be used within PersistentAdsProvider")
  }

  return context
}

export const usePersistentAdIds = () => {
  const { bannerAdId, footerAdId } = usePersistentAdsContext()

  return useMemo(
    () => [bannerAdId, footerAdId].filter((adId): adId is string => Boolean(adId)),
    [bannerAdId, footerAdId],
  )
}

type PersistentAdRegistrationProps = {
  slot: PersistentAdSlot
  adId?: string
}

export const PersistentAdRegistration = ({ slot, adId }: PersistentAdRegistrationProps) => {
  const { setPersistentAdId } = usePersistentAdsContext()

  useEffect(() => {
    setPersistentAdId(slot, adId)
  }, [adId, setPersistentAdId, slot])

  return null
}

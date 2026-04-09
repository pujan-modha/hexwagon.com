import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { DashboardAdsSection } from "~/app/(web)/dashboard/ads-section"
import { auth } from "~/lib/auth"
import { findUserAdsByEmail } from "~/server/web/ads/queries"

const DashboardAdsPage = async () => {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user?.email) {
    throw redirect("/auth/login?next=/dashboard/ads")
  }

  const ads = await findUserAdsByEmail(session.user.email)

  return <DashboardAdsSection ads={ads} />
}

export default DashboardAdsPage

import { notFound } from "next/navigation"
import { withAdminPage } from "~/components/admin/auth-hoc"
import { Wrapper } from "~/components/admin/wrapper"
import { findLicenseList } from "~/server/admin/licenses/queries"
import { findPlatformBySlug } from "~/server/admin/platforms/queries"
import { PlatformForm } from "../_components/platform-form"

type PageProps = {
  params: Promise<{ slug: string }>
}

const UpdatePlatformPage = async ({ params }: PageProps) => {
  const { slug } = await params
  const platform = await findPlatformBySlug(slug)

  if (!platform) notFound()

  return (
    <Wrapper size="lg">
      <PlatformForm
        title={`Edit ${platform.name}`}
        platform={platform}
        licensesPromise={findLicenseList()}
      />
    </Wrapper>
  )
}

export default withAdminPage(UpdatePlatformPage)

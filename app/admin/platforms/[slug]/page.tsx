import { notFound } from "next/navigation"
import { withAdminPage } from "~/components/admin/auth-hoc"
import { Wrapper } from "~/components/admin/wrapper"
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
      />
    </Wrapper>
  )
}

export default withAdminPage(UpdatePlatformPage)

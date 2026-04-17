import { notFound } from "next/navigation"
import { withAdminPage } from "~/components/admin/auth-hoc"
import { Wrapper } from "~/components/admin/wrapper"
import { findConfigBySlug } from "~/server/admin/configs/queries"
import { findPlatformList } from "~/server/admin/platforms/queries"
import { findThemeList } from "~/server/admin/themes/queries"
import { ConfigForm } from "../_components/config-form"

type PageProps = {
  params: Promise<{ slug: string }>
}

const UpdateConfigPage = async ({ params }: PageProps) => {
  const { slug } = await params
  const config = await findConfigBySlug(slug)

  if (!config) notFound()

  return (
    <Wrapper size="lg">
      <ConfigForm
        title={`Edit ${config.name}`}
        config={config}
        platformsPromise={findPlatformList()}
        themesPromise={findThemeList()}
      />
    </Wrapper>
  )
}

export default withAdminPage(UpdateConfigPage)

import { notFound } from "next/navigation"
import { withAdminPage } from "~/components/admin/auth-hoc"
import { Wrapper } from "~/components/admin/wrapper"
import { findPlatformList } from "~/server/admin/platforms/queries"
import { findPortBySlug } from "~/server/admin/ports/queries"
import { findThemeList } from "~/server/admin/themes/queries"
import { PortForm } from "../_components/port-form"

type PageProps = {
  params: Promise<{ slug: string }>
}

const UpdatePortPage = async ({ params }: PageProps) => {
  const { slug } = await params
  const port = await findPortBySlug(slug)

  if (!port) notFound()

  return (
    <Wrapper size="lg">
      <PortForm
        title={`Edit ${port.name ?? port.slug}`}
        port={port}
        platformsPromise={findPlatformList()}
        themesPromise={findThemeList()}
      />
    </Wrapper>
  )
}

export default withAdminPage(UpdatePortPage)

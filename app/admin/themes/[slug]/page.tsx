import { notFound } from "next/navigation"
import { withAdminPage } from "~/components/admin/auth-hoc"
import { Wrapper } from "~/components/admin/wrapper"
import { findLicenseList } from "~/server/admin/licenses/queries"
import { findThemeBySlug } from "~/server/admin/themes/queries"
import { ThemeForm } from "../_components/theme-form"

type PageProps = {
  params: Promise<{ slug: string }>
}

const UpdateThemePage = async ({ params }: PageProps) => {
  const { slug } = await params
  const theme = await findThemeBySlug(slug)

  if (!theme) notFound()

  return (
    <Wrapper size="lg">
      <ThemeForm title={`Edit ${theme.name}`} theme={theme} licensesPromise={findLicenseList()} />
    </Wrapper>
  )
}

export default withAdminPage(UpdateThemePage)

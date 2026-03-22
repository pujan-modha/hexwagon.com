import { withAdminPage } from "~/components/admin/auth-hoc"
import { Wrapper } from "~/components/admin/wrapper"
import { findLicenseList } from "~/server/admin/licenses/queries"
import { ThemeForm } from "../_components/theme-form"

const NewThemePage = async () => {
  return (
    <Wrapper size="lg">
      <ThemeForm title="Create theme" licensesPromise={findLicenseList()} />
    </Wrapper>
  )
}

export default withAdminPage(NewThemePage)

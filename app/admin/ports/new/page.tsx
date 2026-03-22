import { Wrapper } from "~/components/admin/wrapper"
import { withAdminPage } from "~/components/admin/auth-hoc"
import { PortForm } from "../_components/port-form"
import { findLicenseList } from "~/server/admin/licenses/queries"
import { findPlatformList } from "~/server/admin/platforms/queries"
import { findThemeList } from "~/server/admin/themes/queries"

const NewPortPage = async () => {
  return (
    <Wrapper size="lg">
      <PortForm
        title="Create port"
        licensesPromise={findLicenseList()}
        platformsPromise={findPlatformList()}
        themesPromise={findThemeList()}
      />
    </Wrapper>
  )
}

export default withAdminPage(NewPortPage)

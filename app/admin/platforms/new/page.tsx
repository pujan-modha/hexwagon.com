import { withAdminPage } from "~/components/admin/auth-hoc"
import { Wrapper } from "~/components/admin/wrapper"
import { findLicenseList } from "~/server/admin/licenses/queries"
import { PlatformForm } from "../_components/platform-form"

const NewPlatformPage = async () => {
  return (
    <Wrapper size="lg">
      <PlatformForm title="Create platform" licensesPromise={findLicenseList()} />
    </Wrapper>
  )
}

export default withAdminPage(NewPlatformPage)

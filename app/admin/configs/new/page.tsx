import { withAdminPage } from "~/components/admin/auth-hoc"
import { Wrapper } from "~/components/admin/wrapper"
import { findPlatformList } from "~/server/admin/platforms/queries"
import { findThemeList } from "~/server/admin/themes/queries"
import { ConfigForm } from "../_components/config-form"

const NewConfigPage = async () => {
  return (
    <Wrapper size="lg">
      <ConfigForm
        title="Create config"
        platformsPromise={findPlatformList()}
        themesPromise={findThemeList()}
      />
    </Wrapper>
  )
}

export default withAdminPage(NewConfigPage)

import { withAdminPage } from "~/components/admin/auth-hoc"
import { siteConfig } from "~/config/site"

function SitePage() {
  return (
    <iframe
      src={siteConfig.url}
      title="Site Preview"
      className="-m-4 w-[calc(100%+2rem)] h-[calc(100vh)] sm:-mx-6 sm:w-[calc(100%+3rem)]"
    />
  )
}

export default withAdminPage(SitePage)

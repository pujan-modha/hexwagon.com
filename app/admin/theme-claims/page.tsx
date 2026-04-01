import { withAdminPage } from "~/components/admin/auth-hoc";
import { H3 } from "~/components/common/heading";
import { findThemeMaintainerClaims } from "~/server/admin/theme-claims/queries";
import { ThemeClaimsTable } from "./_components/theme-claims-table";

const ThemeClaimsPage = async () => {
  const claimsPromise = findThemeMaintainerClaims();

  return (
    <div className="grid gap-4">
      <H3>Theme Maintainer Claims</H3>
      <ThemeClaimsTable claimsPromise={claimsPromise} />
    </div>
  );
};

export default withAdminPage(ThemeClaimsPage);

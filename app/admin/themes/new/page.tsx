import { withAdminPage } from "~/components/admin/auth-hoc";
import { Wrapper } from "~/components/admin/wrapper";
import { ThemeForm } from "../_components/theme-form";

const NewThemePage = async () => {
  return (
    <Wrapper size="lg">
      <ThemeForm title="Create theme" />
    </Wrapper>
  );
};

export default withAdminPage(NewThemePage);

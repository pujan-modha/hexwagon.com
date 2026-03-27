import { withAdminPage } from "~/components/admin/auth-hoc";
import { Wrapper } from "~/components/admin/wrapper";
import { PlatformForm } from "../_components/platform-form";

const NewPlatformPage = async () => {
  return (
    <Wrapper size="lg">
      <PlatformForm title="Create platform" />
    </Wrapper>
  );
};

export default withAdminPage(NewPlatformPage);

import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function SuccessPage(props: PageProps) {
  await props.params;
  redirect("/dashboard");
}

import { redirect } from "next/navigation"

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<unknown>
}

export default async function SubmitPackages(props: PageProps) {
  await props.params
  redirect("/dashboard")
}

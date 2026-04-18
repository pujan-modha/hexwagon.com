import { allPosts } from "content-collections"
import type { Metadata } from "next"
import { PostCard } from "~/components/web/posts/post-card"
import { Breadcrumbs } from "~/components/web/ui/breadcrumbs"
import { Grid } from "~/components/web/ui/grid"
import { Intro, IntroDescription, IntroTitle } from "~/components/web/ui/intro"
import { metadataConfig } from "~/config/metadata"

export const metadata: Metadata = {
  title: "HexWagon Blog",
  description: "Notes on theme design, port quality, and maintainership across editor platforms.",
  openGraph: { ...metadataConfig.openGraph, url: "/blog" },
  alternates: { ...metadataConfig.alternates, canonical: "/blog" },
}

export default function BlogPage() {
  const posts = allPosts.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))

  return (
    <>
      <Breadcrumbs
        items={[
          {
            href: "/blog",
            name: "Blog",
          },
        ]}
      />

      <Intro>
        <IntroTitle>{`${metadata.title}`}</IntroTitle>
        <IntroDescription>{metadata.description}</IntroDescription>
      </Intro>

      {posts.length ? (
        <Grid>
          {posts.map(post => (
            <PostCard key={post._meta.path} post={post} />
          ))}
        </Grid>
      ) : (
        <p>No blog posts published yet.</p>
      )}
    </>
  )
}

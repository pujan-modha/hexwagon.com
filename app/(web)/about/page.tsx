import type { Metadata } from "next"
import { Link } from "~/components/common/link"
import { Prose } from "~/components/common/prose"
import { ExternalLink } from "~/components/web/external-link"
import { Intro, IntroDescription, IntroTitle } from "~/components/web/ui/intro"
import { config } from "~/config"
import { metadataConfig } from "~/config/metadata"

export const metadata: Metadata = {
  title: "About Us",
  description: `${config.site.name} is a community driven directory of color theme ports across platforms and applications.`,
  openGraph: { ...metadataConfig.openGraph, url: "/about" },
  alternates: { ...metadataConfig.alternates, canonical: "/about" },
}

export default function AboutPage() {
  return (
    <>
      <Intro>
        <IntroTitle>{`${metadata.title}`}</IntroTitle>
        <IntroDescription>{metadata.description}</IntroDescription>
      </Intro>

      <Prose>
        <h3 id="what-is-it">What is {config.site.name}?</h3>

        <p>
          <Link href="/" title={config.site.tagline}>
            {config.site.name}
          </Link>{" "}
          is a curated directory for theme ports. We help people discover which themes exist, which
          platforms they support, and where they are actively maintained.
        </p>

        <h3 id="how-does-it-work">How does it work?</h3>

        <p>
          We highlight featured ports and surface theme and platform pages that have the most
          activity. The goal is to make it easy to compare options, find compatible setups, and
          browse the ecosystem without hunting through scattered project pages.
        </p>

        <p>
          New entries are reviewed, published, and updated over time so the directory stays useful
          as themes evolve.
        </p>

        <h3 id="why-theme-ports">Why theme ports?</h3>

        <p>
          Theme ports let the same visual language travel across different applications and
          platforms. That makes it easier to maintain a consistent look, compare implementations,
          and share theme ideas with the wider community.
        </p>

        <p>HexWagon exists to make that ecosystem easier to browse and easier to contribute to.</p>

        <h3 id="contribute">Contribute</h3>

        <p>
          If you know a theme, platform, or port we should list, send it our way. You can also
          suggest improvements to the site or flag content that needs an update.
        </p>

        <p>Thanks for being part of the HexWagon community.</p>

        <h3 id="affiliate-links">Affiliate links</h3>

        <p>
          The site participates in affiliate programs with select service providers, where some
          links are automatically tracked as affiliate links. I try to make sure that these services
          are not given preferential treatment.
        </p>

        <h3 id="about-the-author">About the Author</h3>

        <p>
          I'm a recent CS graduate and solopreneur. I've been building web applications for over 5
          years. I'm passionate about software development and I love to contribute to the community
          in any way I can.
        </p>

        <p>
          I'm always looking for new projects to work on and new people to collaborate with. Feel
          free to reach out to me if you have any questions or suggestions.
        </p>

        <p>
          Also, huge thanks to{" "}
          <ExternalLink href="https://openalternative.co" title="openalternative" doFollow>
            openalternative
          </ExternalLink>{" "}
          for being an awesome open source project that inspired me to build HexWagon and for being
          a great example of the kind of project I want to see more of in the world.
        </p>

        <p>
          –{" "}
          <ExternalLink href={config.links.author} doFollow>
            Pujan Modha
          </ExternalLink>
        </p>
      </Prose>
    </>
  )
}

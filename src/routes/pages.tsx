import type { PostSummary } from "@jrcodex/seo-kit";
import { Hono } from "hono";

import { ABOUT } from "../../content/about";
import { HOME } from "../../content/home";
import { readPosts, platformClient } from "../../lib/platform/reads";
import { readVideos } from "../../lib/platform/videos";
import { projectsPort, type ProjectCard, type ProjectKind } from "../../lib/projects";
import { PERSON_NAME, absolute } from "../../lib/site";
import type { AppEnv } from "../env";
import { PostMeta } from "../views/post";
import { ButtonLink, ChipList, EmptyState, Section, SectionHeader, Shell, StatusChip } from "../views/ui";
import { renderPage, wantsOriginals } from "./render";

/**
 * The narrative pages and the work (spec 003 section 4): home, about, work,
 * videos. The work comes through the projects port; posts and videos through
 * the platform reads.
 */
export const pages = new Hono<AppEnv>();

const PERSON_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: PERSON_NAME,
  url: absolute("/"),
  jobTitle: "Software engineer",
};

pages.get("/", async (c) => {
  const [work, posts] = await Promise.all([projectsPort.list(), latestPosts(c.env, wantsOriginals(c))]);
  const flagship = work.filter((card) => card.kind !== "client").slice(0, 3);
  const engine = work.find((card) => card.slug === "proprietor-systems");
  const platform = work.find((card) => card.slug === "platform");
  const proofs = [...(engine?.facts ?? []), ...(platform?.facts.slice(0, 1) ?? [])];
  return renderPage(
    c,
    { title: PERSON_NAME, description: `${HOME.headline} ${HOME.lede}`, path: "/", ogType: "profile", jsonLd: [PERSON_JSON_LD] },
    <>
      <Section labelledBy="hero-title">
        <Shell>
          <div class="hero">
            <div class="hero__copy">
              <p class="eyebrow hero__eyebrow">{HOME.eyebrow}</p>
              <h1 id="hero-title" class="hero__title">
                {PERSON_NAME}
              </h1>
              <p class="lede hero__lede">{HOME.headline}</p>
              <p class="hero__lede">{HOME.lede}</p>
              <div class="hero__actions">
                <ButtonLink href="/work">See the work</ButtonLink>
                <ButtonLink href="/contact" variant="secondary">
                  Get in touch
                </ButtonLink>
              </div>
            </div>
          </div>
          {proofs.length > 0 ? (
            <ul class="proof-strip" aria-label="Numbers from the repositories">
              {proofs.map((fact) => (
                <li class="proof">
                  <span class="proof__value">{fact.value}</span>
                  <span class="proof__label">{fact.label}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </Shell>
      </Section>
      <Section rule labelledBy="work-title">
        <Shell>
          <SectionHeader id="work-title" title={HOME.workTitle} actions={<ButtonLink href="/work" variant="tertiary">All work</ButtonLink>} />
          <WorkTiles cards={flagship} headingLevel="h3" />
        </Shell>
      </Section>
      {posts.length > 0 ? (
        <Section rule labelledBy="writing-title">
          <Shell>
            <SectionHeader id="writing-title" title={HOME.writingTitle} actions={<ButtonLink href="/blog" variant="tertiary">All writing</ButtonLink>} />
            <PostCards posts={posts.slice(0, 3)} headingLevel="h3" />
          </Shell>
        </Section>
      ) : null}
      <Section rule labelledBy="contact-title">
        <Shell>
          <div class="cta-panel">
            <div>
              <h2 id="contact-title" class="cta-panel__title">
                {HOME.contactTitle}
              </h2>
              <p class="cta-panel__text">{HOME.contactBody}</p>
            </div>
            <ButtonLink href="/contact">Contact me</ButtonLink>
          </div>
        </Shell>
      </Section>
    </>,
  );
});

pages.get("/about", (c) =>
  renderPage(
    c,
    { title: "About", description: ABOUT.lede, path: "/about", ogType: "profile", jsonLd: [PERSON_JSON_LD] },
    <>
      <Section>
        <Shell size="narrow">
          <SectionHeader as="h1" eyebrow="About" title="Self-taught software engineer" lede={ABOUT.lede} />
          <div class="prose-body stack">
            {ABOUT.story.map((paragraph) => (
              <p>{paragraph}</p>
            ))}
          </div>
        </Shell>
      </Section>
      <Section rule labelledBy="how-title">
        <Shell>
          <SectionHeader id="how-title" title="How I build" />
          <ul class="tile-grid">
            {ABOUT.howIBuild.map((item) => (
              <li class="tile">
                <h3 class="tile__title">{item.title}</h3>
                <p class="tile__body">{item.body}</p>
              </li>
            ))}
          </ul>
        </Shell>
      </Section>
      <Section rule labelledBy="credentials-title">
        <Shell size="narrow">
          <SectionHeader id="credentials-title" title="Credentials and study" />
          <dl class="fact-list">
            <dt>Certified</dt>
            {ABOUT.credentials.earned.map((item) => (
              <dd>{item}</dd>
            ))}
            <dt>Studying</dt>
            {ABOUT.credentials.studying.map((item) => (
              <dd>{item}</dd>
            ))}
          </dl>
          <h3 class="about-subheading">Education: coursework, no degree</h3>
          <ul class="timeline">
            {ABOUT.education.map((row) => (
              <li class="timeline__item">
                <span class="timeline__when">{row.when}</span>
                <p class="timeline__title">{row.where}</p>
                <p class="timeline__body">{row.what}</p>
              </li>
            ))}
          </ul>
          <h3 class="about-subheading">Reading</h3>
          <ul class="key-list">
            {ABOUT.reading.map((book) => (
              <li>
                <cite>{book.title}</cite>, {book.author}
              </li>
            ))}
          </ul>
        </Shell>
      </Section>
    </>,
  ),
);

const KIND_TITLES: Record<ProjectKind, string> = {
  product: "Products",
  "open-source": "Open source",
  platform: "Platform",
  tooling: "Tools at work",
  client: "Client work",
};

pages.get("/work", async (c) => {
  const cards = await projectsPort.list();
  const kinds = (Object.keys(KIND_TITLES) as ProjectKind[]).filter((kind) => cards.some((card) => card.kind === kind));
  return renderPage(
    c,
    { title: "Work", description: "What I've built: Proprietor Systems, an encrypted inbox, my own Kubernetes platform, Fluency, shop tools, and client sites.", path: "/work" },
    <Section>
      <Shell>
        <SectionHeader as="h1" eyebrow="Work" title="What I've built" lede="Summaries for now. Each will get its own page, written on the same platform that runs this site." />
        {kinds.map((kind) => (
          <section class="work-group" aria-labelledby={`kind-${kind}`}>
            <h2 id={`kind-${kind}`}>{KIND_TITLES[kind]}</h2>
            <WorkTiles cards={cards.filter((card) => card.kind === kind)} headingLevel="h3" />
          </section>
        ))}
      </Shell>
    </Section>,
  );
});

pages.get("/videos", async (c) => {
  const videos = await readVideos(c.env, platformClient(c.env));
  return renderPage(
    c,
    { title: "Videos", description: "Short videos about what I build.", path: "/videos", noindex: videos.length === 0 },
    <Section>
      <Shell>
        <SectionHeader as="h1" eyebrow="Videos" title="Videos" />
        {videos.length === 0 ? (
          <EmptyState title="Nothing here yet">
            <p>
              Clips will appear here when I publish them. Meanwhile, the <a href="/work">work</a> is written up.
            </p>
          </EmptyState>
        ) : (
          <ul class="card-grid">
            {videos.map((video) => (
              <li class="stack">
                <video class={`video-player ${video.format}`} src={video.src} controls preload="metadata" aria-label={video.title} />
                <p>
                  {video.title} <span class="post-meta">({Math.round(video.seconds)} s)</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </Shell>
    </Section>,
  );
});

export function WorkTiles({ cards, headingLevel }: { cards: ProjectCard[]; headingLevel: "h2" | "h3" }) {
  const Heading = headingLevel;
  return (
    <ul class="tile-grid">
      {cards.map((card) => (
        <li class="tile">
          <Heading class="tile__title">
            {card.path ? <a href={card.path}>{card.title}</a> : card.title} <StatusChip status={card.status} />
          </Heading>
          {card.role ? <p class="tile__note">{card.role}</p> : null}
          <p class="tile__body">{card.summary}</p>
          {card.highlights.length > 0 ? (
            <ul class="work-card__highlights">
              {card.highlights.map((point) => (
                <li>{point}</li>
              ))}
            </ul>
          ) : null}
          {card.facts.length > 0 ? (
            <dl class="work-card__facts">
              {card.facts.map((fact) => (
                <div class="work-card__fact">
                  <dt class="work-card__fact-label">{fact.label}</dt>
                  <dd class="work-card__fact-value">{fact.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <ChipList items={card.stack} label={`${card.title}: technologies`} />
          {card.links.map((link) => (
            <a class="tile__link" href={link.href} rel="noopener">
              {link.label}
            </a>
          ))}
        </li>
      ))}
    </ul>
  );
}

export function PostCards({ posts, headingLevel }: { posts: PostSummary[]; headingLevel: "h2" | "h3" }) {
  const Heading = headingLevel;
  return (
    <ul class="card-grid">
      {posts.map((post) => (
        <li class="card">
          <figure class="card__media">
            {post.hero ? <img src={post.hero.src} srcset={post.hero.srcset} sizes="(max-width: 48rem) 100vw, 33vw" alt="" loading="lazy" decoding="async" /> : <div class="media-placeholder" aria-hidden="true" />}
          </figure>
          <Heading class="card__title">
            <a class="card__link" href={post.path}>
              {post.title}
            </a>
          </Heading>
          <p class="card__desc">{post.excerpt}</p>
          <div class="card__footer">
            <PostMeta post={post} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** The home page's writing section: hidden when the blog is empty or the engine cannot answer. */
async function latestPosts(env: AppEnv["Bindings"], originals: boolean): Promise<PostSummary[]> {
  try {
    return await readPosts(env, { originals });
  } catch (error) {
    console.warn(`[home] posts unavailable: ${error instanceof Error ? error.name : "error"}`);
    return [];
  }
}

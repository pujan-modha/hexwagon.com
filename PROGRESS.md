# HexWagon Implementation Progress

> Transforming dirstarter → HexWagon: centralized theme aggregator

## Project Overview

**HexWagon** is a centralized theme aggregator where users discover, share, and manage color theme ports across applications and developer tools.

- **Theme** (was Alternative) — color scheme (Dracula, Nord, Catppuccin)
- **Platform** (was Category) — app/tool (VS Code, Ghostty, Zed)
- **Port** (was Tool) — specific theme implementation for a platform

## Code Style & Patterns Reference

### Prisma Schema Conventions
- Use `@db.Citext` for case-insensitive text fields (`name`, `slug`)
- Relations use explicit FK fields (`themeId String`, `theme Theme @relation(...)`)
- Compound unique constraints with `@@unique([field1, field2], map: "name")`
- Index on all foreign keys and commonly queried fields
- Use `onDelete: Cascade` for user-owned content relations

### Query Pattern (Pattern B — Web)
```ts
import { unstable_cacheLife as cacheLife, unstable_cacheTag as cacheTag } from "next/cache"

export const findEntities = async ({ where, orderBy, ...args }) => {
  "use cache"
  cacheTag("entities")
  cacheLife("max")
  return db.entity.findMany({ ...args, where, orderBy, select: entityManyPayload })
}
```

### Payload Pattern (Pattern A — Select Objects)
```ts
export const entityManyPayload = Prisma.validator<Prisma.EntitySelect>()({
  id: true,
  name: true,
  slug: true,
  // ...fields
  _count: { select: { ports: { where: { status: PortStatus.Published } } } },
})
export type EntityMany = Prisma.EntityGetPayload<{ select: typeof entityManyPayload }>
```

### Admin Action Pattern (Pattern D)
```ts
"use server"
import { slugify } from "@primoui/utils"
import { revalidatePath, revalidateTag } from "next/cache"
import { after } from "next/server"
import { z } from "zod"
import { removeS3Directories } from "~/lib/media"
import { adminProcedure } from "~/lib/safe-actions"

export const upsertEntity = adminProcedure
  .createServerAction()
  .input(entitySchema)
  .handler(async ({ input: { id, ...input } }) => {
    const entity = id
      ? await db.entity.update({ where: { id }, data: { ...input, slug: input.slug || slugify(input.name) } })
      : await db.entity.create({ data: { ...input, slug: input.slug || slugify(input.name) } })
    revalidateTag("entities")
    revalidateTag(`entity-${entity.slug}`)
    return entity
  })
```

### Admin Schema Pattern (Pattern C)
```ts
import type { Entity } from "@prisma/client"
import { createSearchParamsCache, parseAsInteger, parseAsString, parseAsStringEnum } from "nuqs/server"
import { z } from "zod"
import { getSortingStateParser } from "~/lib/parsers"

export const entitiesTableParamsSchema = {
  name: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(25),
  sort: getSortingStateParser<Entity>().withDefault([{ id: "name", desc: false }]),
  // ...
}
export const entitiesTableParamsCache = createSearchParamsCache(entitiesTableParamsSchema)

export const entitySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  slug: z.string().optional(),
  // ...
})
```

### Server Action Pattern (zsa)
```ts
"use server"
import { headers } from "next/headers"
import { createServerAction } from "zsa"
import { userProcedure } from "~/lib/safe-actions"

export const someAction = userProcedure
  .createServerAction()
  .input(schema)
  .handler(async ({ input, ctx: { user } }) => {
    // implementation
  })
```

### Page Pattern (Next.js App Router)
- Use `generateStaticParams` for static generation
- Use `generateMetadata` for SEO
- Use `cache` for per-request deduplication
- Use `Promise.all` for parallel data fetching
- Wrap dynamic content in `Suspense` with skeleton fallback

### File Naming Conventions
- Directories: `kebab-case` (e.g., `server/web/themes`, `components/catalogue`)
- Files: `kebab-case` (e.g., `payloads.ts`, `port-card.tsx`)
- Payloads/Queries/Actions: plural nouns (`payloads.ts`, `queries.ts`, `actions.ts`)

### shadcn/ui Conventions
- Use `~/components/common/*` for primitives (Button, Card, Badge, etc.)
- Use `~/components/web/ui/*` for layout (Intro, Section, etc.)
- Use `cn()` for conditional classes — never manual template literals
- Use `data-icon` for icons in buttons — never size classes on icons
- Use `gap-*` for spacing — never `space-y-*` or `space-x-*`
- Use `size-*` for equal dimensions — never `w-* h-*`

---

## Phase Checklist

### Phase 1 — Foundation (Database + Config)
- [ ] **1.1** Prisma Schema — Complete rewrite per plan.md §3
  - [ ] Remove: `StackType` enum, `Stack` model, `ToolStatus` enum
  - [ ] Add: `PortStatus`, `SuggestionType`, `SuggestionStatus`, `EditStatus`, `ReportStatus` enums
  - [ ] Update `AdType` enum values
  - [ ] Update `ReportType` enum
  - [ ] Replace `User` model (add ThemeMaintainer relation)
  - [ ] Replace `Alternative` → `Theme` model
  - [ ] Replace `Category` → `Platform` model
  - [ ] Replace `Tool` → `Port` model
  - [ ] Rename `Topic` → `Tag`
  - [ ] Update `License` (add themes/platforms relations)
  - [ ] Update `Ad` (replace alternatives → themes)
  - [ ] Replace `Like` (nullable portId, themeId, platformId)
  - [ ] Replace `Report` (nullable port, theme, platform, comment)
  - [ ] Add: `ColorPalette`, `Suggestion`, `PortEdit`, `Comment`, `ThemeMaintainer`
  - [ ] Run `bun run db:generate`
- [ ] **1.2** Config Files
  - [ ] `config/site.ts` — update to HexWagon branding
  - [ ] `config/links.ts` — update links, remove selfHost
  - [ ] `config/ads.ts` — update AdType values
  - [ ] `env.ts` — remove STACK_ANALYZER env vars
  - [ ] `.env.example` — remove STACK_ANALYZER section
  - [ ] `package.json` — rename to hexwagon

### Phase 2 — Server Layer
- [ ] **2.1** Web Themes (`server/web/themes/`)
  - [ ] `payloads.ts` — themeOnePayload, themeManyPayload, colorPalettePayload
  - [ ] `queries.ts` — searchThemes, findThemes, findThemeSlugs, findTheme, findFeaturedThemes
- [ ] **2.2** Web Platforms (`server/web/platforms/`)
  - [ ] `payloads.ts` — platformOnePayload, platformManyPayload
  - [ ] `queries.ts` — searchPlatforms, findPlatforms, findPlatformSlugs, findPlatform, findFeaturedPlatforms
- [ ] **2.3** Web Ports (refactor `server/web/tools/` → `server/web/ports/`)
  - [ ] Rename directory
  - [ ] Update payloads: rename tool* → port*, update relations
  - [ ] Update queries: rename functions, update filters (alternative→theme, category→platform, stack→tag)
  - [ ] Add `findPortsByThemeAndPlatform`
- [ ] **2.4** Web Tags (refactor `server/web/topics/` → `server/web/tags/`)
  - [ ] Rename directory
  - [ ] Rename topic* → tag* in payloads
  - [ ] Update queries: change relations from tools → ports
- [ ] **2.5** Other Web Changes
  - [ ] DELETE `server/web/stacks/`
  - [ ] UPDATE `server/web/licenses/` (tools → ports)
  - [ ] UPDATE `server/web/ads/` (Alternative → Theme)
  - [ ] CREATE `server/web/comments/queries.ts`
  - [ ] CREATE `server/web/suggestions/queries.ts`
  - [ ] UPDATE `server/web/shared/schema.ts` (filter params, submitPortSchema, submitSuggestionSchema, commentSchema)
- [ ] **2.6** Admin Server
  - [ ] CREATE `server/admin/themes/` (schema, queries, actions)
  - [ ] CREATE `server/admin/platforms/` (schema, queries, actions)
  - [ ] RENAME `server/admin/tools/` → `server/admin/ports/` + update
  - [ ] RENAME `server/admin/alternatives/` → `server/admin/themes/`
  - [ ] RENAME `server/admin/categories/` → `server/admin/platforms/`
  - [ ] CREATE `server/admin/suggestions/` (schema, queries, actions)
  - [ ] CREATE `server/admin/port-edits/` (schema, queries, actions)
  - [ ] CREATE `server/admin/comments/` (queries, actions)

### Phase 3 — Actions
- [ ] **3.1** UPDATE `actions/submit.ts` → `submitPort`
  - [ ] Rename function, update schema, add themeId/platformId
  - [ ] Add duplicate submission check
  - [ ] Update notification
- [ ] **3.2** CREATE `actions/suggest.ts` — submitSuggestion
- [ ] **3.3** UPDATE `actions/report.ts`
  - [ ] Rename reportTool → reportPort
  - [ ] Add reportTheme, reportPlatform, reportComment
  - [ ] Add resolveReport, dismissReport admin actions
- [ ] **3.4** CREATE `actions/comment.ts` — addComment
- [ ] **3.5** CREATE `actions/port-edit.ts` — submitPortEdit
- [ ] **3.6** UPDATE `actions/misc.ts` (indexPorts, indexThemes, indexPlatforms)
- [ ] **3.7** UPDATE `actions/search.ts` (search ports, themes, platforms)
- [ ] **3.8** UPDATE `actions/like.ts` (adapt for ports/themes/platforms)

### Phase 4 — Components
- [ ] **4.1** CREATE `components/catalogue/`
  - [ ] `entity-header.tsx`
  - [ ] `entity-tabs.tsx`
  - [ ] `catalogue-grid.tsx`
  - [ ] `catalogue-list-header.tsx`
  - [ ] `port-list.tsx`
  - [ ] `port-detail.tsx`
  - [ ] `markdown-content.tsx`
  - [ ] `theme-card.tsx`
  - [ ] `platform-card.tsx`
  - [ ] `port-card.tsx`
  - [ ] `theme-platforms-tab.tsx`
  - [ ] `theme-guidelines-tab.tsx`
  - [ ] `color-palette-tab.tsx`
  - [ ] `platform-themes-tab.tsx`
  - [ ] `platform-theme-docs-tab.tsx`
- [ ] **4.2** CREATE `lib/catalogue.ts` — URL builder utilities
- [ ] **4.3** RENAME `components/web/tools/` → `components/web/ports/`
  - [ ] Rename all files tool-* → port-*
  - [ ] DELETE: `tool-alternatives.tsx`, `tool-stacks.tsx`
  - [ ] UPDATE: imports, types, relations
- [ ] **4.4** CREATE `components/submission/`
  - [ ] `submission-wizard.tsx`
  - [ ] `step-theme.tsx`
  - [ ] `step-platform.tsx`
  - [ ] `step-details.tsx`
  - [ ] `step-review.tsx`
- [ ] **4.5** CREATE `stores/submission-store.ts` — Zustand store
- [ ] **4.6** CREATE `components/analytics/`
  - [ ] `page-view-event.tsx`
  - [ ] `source-link-button.tsx`
- [ ] **4.7** CREATE `hooks/use-analytics.ts`
- [ ] **4.8** CREATE `components/web/comments/`
  - [ ] `comment-thread.tsx`
  - [ ] `comment-form.tsx`
- [ ] **4.9** CREATE `components/web/suggestions/` — `suggestion-form.tsx`
- [ ] **4.10** UPDATE Layout components
  - [ ] `components/web/header.tsx` — nav items
  - [ ] `components/web/footer.tsx` — branding
  - [ ] `components/web/search-form.tsx` — "find theme for platform"
- [ ] **4.11** DELETE `components/web/stacks/`
- [ ] **4.12** DELETE `components/web/alternatives/`
- [ ] **4.13** DELETE `components/web/categories/`

### Phase 5 — Routes
- [ ] **5.1** CREATE Theme Routes (`app/(web)/themes/`)
  - [ ] `(themes)/page.tsx` — list all themes
  - [ ] `[slug]/page.tsx` — theme detail with tabs
  - [ ] `[slug]/[platform]/page.tsx` — ports filtered by theme+platform
  - [ ] `[slug]/[platform]/[portId]/page.tsx` — port detail + comments
- [ ] **5.2** CREATE Platform Routes (`app/(web)/platforms/`)
  - [ ] `(platforms)/page.tsx` — list all platforms
  - [ ] `[slug]/page.tsx` — platform detail with tabs
  - [ ] `[slug]/[theme]/page.tsx` — mirrored port list
  - [ ] `[slug]/[theme]/[portId]/page.tsx` — mirrored port detail
- [ ] **5.3** UPDATE `app/(web)/(home)/page.tsx` — new homepage layout
- [ ] **5.4** UPDATE `app/(web)/submit/` — submission wizard
- [ ] **5.5** CREATE `app/(web)/suggest/page.tsx` — suggestion form
- [ ] **5.6** CREATE `app/(web)/search/page.tsx` — full search results
- [ ] **5.7** UPDATE `app/(web)/dashboard/` — ports, suggestions, likes
- [ ] **5.8** CREATE `app/api/health/route.ts` — health check
- [ ] **5.9** DELETE routes
  - [ ] `app/(web)/alternatives/`
  - [ ] `app/(web)/categories/`
  - [ ] `app/(web)/stacks/`
  - [ ] `app/(web)/self-hosted/`
  - [ ] `app/(web)/[slug]/`

### Phase 6 — Admin Panel
- [ ] **6.1** RENAME `app/admin/tools/` → `app/admin/ports/`
  - [ ] Rename files, update columns (add theme, platform)
  - [ ] Add reject with rejectionReason
  - [ ] Add "Set Official" button
- [ ] **6.2** RENAME `app/admin/alternatives/` → `app/admin/themes/`
  - [ ] Color palette management UI
  - [ ] Theme maintainer assignment
  - [ ] Guidelines markdown editor
- [ ] **6.3** RENAME `app/admin/categories/` → `app/admin/platforms/`
  - [ ] Remove hierarchy fields
  - [ ] Add markdown editors for installInstructions, themeCreationDocs
- [ ] **6.4** CREATE `app/admin/suggestions/`
- [ ] **6.5** CREATE `app/admin/port-edits/`
- [ ] **6.6** CREATE `app/admin/comments/`
- [ ] **6.7** UPDATE `app/admin/reports/` — resolution workflow
- [ ] **6.8** UPDATE `app/admin/layout.tsx` — nav items
- [ ] **6.9** UPDATE `app/admin/page.tsx` — stats cards

### Phase 7 — Emails
- [ ] **7.1** RENAME `emails/submission.tsx` → `emails/port-submitted.tsx`
- [ ] **7.2** RENAME `emails/submission-published.tsx` → `emails/port-approved.tsx`
- [ ] **7.3** RENAME `emails/submission-scheduled.tsx` → `emails/port-scheduled.tsx`
- [ ] **7.4** CREATE `emails/port-rejected.tsx`
- [ ] **7.5** CREATE `emails/suggestion-submitted.tsx`
- [ ] **7.6** CREATE `emails/suggestion-approved.tsx`
- [ ] **7.7** CREATE `emails/suggestion-rejected.tsx`
- [ ] **7.8** CREATE `emails/port-edit-approved.tsx`
- [ ] **7.9** CREATE `emails/port-edit-rejected.tsx`
- [ ] **7.10** UPDATE `lib/notifications.ts` — rename Tool → Port, add new notifications

### Phase 8 — Search & Cron
- [ ] **8.1** UPDATE `lib/indexing.ts` — indexPorts, indexThemes, indexPlatforms
- [ ] **8.2** UPDATE `functions/cron.*.ts`
  - [ ] Update db.tool → db.port
  - [ ] Rename cron.publish-tools.ts → cron.publish-ports.ts
- [ ] **8.3** UPDATE `next-sitemap.config.js`
- [ ] **8.4** RENAME `lib/tools.ts` → `lib/ports.ts`

### Phase 9 — Analytics & Health
- [ ] **9.1** Wire PostHog events into pages
- [ ] **9.2** Health check endpoint (already in Phase 5.7)

### Phase 10 — Polish & Cleanup
- [ ] **10.1** DELETE `lib/stack-analysis.ts`
- [ ] **10.2** Remove all stack/self-hosted references
- [ ] **10.3** Global search & replace
  - [ ] Alternative → Theme, Tool → Port, Category → Platform
  - [ ] openalternative → hexwagon
- [ ] **10.4** UPDATE OG image templates
- [ ] **10.5** SEO audit — canonical URLs, JSON-LD, meta tags
- [ ] **10.6** UI polish — responsive, dark mode, animations

---

## Verification Commands

```bash
# Phase 1
bun run db:generate

# Phase 2
bun run db:generate

# Phase 5
bun run dev
bun run build

# Phase 10
bun run build
bun run typecheck
bun run lint
```

---

## Notes

- All new components must use existing UI primitives from `~/components/common/*` and `~/components/web/ui/*`
- Follow exact patterns from existing code — no deviations
- Use `cn()` from `~/lib/utils` for conditional classes
- Keep `"use server"` directive on all server actions
- Use `after()` from `next/server` for async cleanup after response
- All admin actions use `adminProcedure` from `~/lib/safe-actions`
- All user actions use `userProcedure` from `~/lib/safe-actions`
- Cache tags follow pattern: `cacheTag("entity")`, `cacheTag("entity", \`entity-${slug}\`)`
- Import alias `~/` maps to project root

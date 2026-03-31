# HexWagon — Transformation Plan

## 1. Project Overview

Transform the dirstarter (OpenAlternative) codebase into **HexWagon**: a centralized theme aggregator where users discover, share, and manage color theme ports across applications and developer tools.

**Core concept:** A theme (e.g., Dracula, Nord, Catppuccin) can have ports for many platforms (e.g., VS Code, Ghostty, Zed). Users browse by theme or by platform. Users can submit ports, suggest new themes/platforms, and like content.

---

## 2. Domain Mapping — Old → New

The existing dirstarter entities map to HexWagon as follows:

| Dirstarter Entity | HexWagon Entity  | Notes                                                                                 |
| ----------------- | ---------------- | ------------------------------------------------------------------------------------- |
| **Tool**          | **Port**         | The core content item. A port is a specific implementation of a theme for a platform. |
| **Alternative**   | **Theme**        | Top-level color scheme (Dracula, Nord, etc.). Admin-only creation.                    |
| **Category**      | **Platform**     | App/tool a theme can be ported to (VS Code, Ghostty, etc.). Admin-only creation.      |
| **Stack**         | _(remove)_       | Not relevant to theme aggregation.                                                    |
| **Topic**         | **Tag**          | Freeform tags for ports (e.g., "dark", "pastel", "high-contrast").                    |
| **License**       | **License**      | Keep — themes/ports can have licenses.                                                |
| **Like**          | **Like**         | Expand — users can like ports, themes, and platforms.                                 |
| **Report**        | **Report**       | Keep — users can report ports/themes/platforms.                                       |
| **Ad**            | **Ad**           | Keep — ad system carries over.                                                        |
| **User**          | **User**         | Expand — add `themeMaintainer` role concept.                                          |
| _(new)_           | **Suggestion**   | Users suggest new themes or platforms for admin review.                               |
| _(new)_           | **PortEdit**     | Pending edits to ports that require admin approval.                                   |
| _(new)_           | **Comment**      | Comments on port detail pages.                                                        |
| _(new)_           | **ColorPalette** | Official color swatches attached to a theme.                                          |

---

## 3. New Prisma Schema Design

### Core Models

```
Theme (was Alternative)
├── id, name, slug, description
├── websiteUrl, faviconUrl, repositoryUrl?
├── author, authorUrl?
├── colors → ColorPalette[]  (official hex swatches)
├── guidelines (text/markdown — spec for creating a port)
├── isFeatured, pageviews
├── ports → Port[]
├── likes → Like[]
└── createdAt, updatedAt

Platform (was Category — flattened, no hierarchy)
├── id, name, slug, description
├── websiteUrl, faviconUrl
├── installInstructions (markdown — how to install themes)
├── themeCreationDocs (markdown — how to create themes for this platform)
├── isFeatured, pageviews
├── ports → Port[]
├── likes → Like[]
└── createdAt, updatedAt

Port (was Tool)
├── id, slug
├── name?, description, content? (markdown)
├── repositoryUrl, installUrl?
├── screenshotUrl, faviconUrl?
├── isOfficial (marked by theme maintainer)
├── rejectionReason? (set by admin on rejection)
├── isFeatured, score
├── status (Draft | Scheduled | Published | PendingEdit)
├── theme → Theme (required FK)
├── platform → Platform (required FK)
├── author → User (required FK — the submitter)
├── likes → Like[]
├── comments → Comment[]
├── reports → Report[]
├── tags → Tag[]
├── pendingEdit → PortEdit?
├── @@unique([themeId, platformId, isOfficial]) WHERE isOfficial = true
└── createdAt, updatedAt, publishedAt

ColorPalette
├── id
├── label (e.g., "Background", "Foreground", "Red")
├── hex (e.g., "#282a36")
├── order (for display ordering)
├── theme → Theme (FK)
└── createdAt, updatedAt

Suggestion
├── id
├── type (Theme | Platform)
├── name, description, websiteUrl?
├── status (Pending | Approved | Rejected)
├── submitter → User (FK)
├── adminNote?
└── createdAt, updatedAt

PortEdit
├── id
├── port → Port (FK)
├── editor → User (FK)
├── diff (JSON — stores field-level changes)
├── status (Pending | Approved | Rejected)
├── adminNote?
└── createdAt, updatedAt

Comment
├── id
├── content (text)
├── author → User (FK)
├── port → Port (FK)
├── parentId? → Comment (self-referencing for replies)
└── createdAt, updatedAt

Tag (was Topic)
├── slug (PK)
├── ports → Port[]
└── createdAt, updatedAt
```

### Expanded Like Model

```
Like
├── id
├── user → User (FK)
├── port → Port? (FK, nullable)
├── theme → Theme? (FK, nullable)
├── platform → Platform? (FK, nullable)
├── @@unique([userId, portId])
├── @@unique([userId, themeId])
├── @@unique([userId, platformId])
└── createdAt
```

### Expanded Report Model

```
Report
├── id
├── type (BrokenLink | Inappropriate | Outdated | Other)
├── message?
├── status (Open | Resolved | Dismissed)
├── resolvedBy → User? (FK — admin who resolved)
├── resolvedAt?
├── user → User (FK)
├── port → Port? (FK)
├── theme → Theme? (FK)
├── platform → Platform? (FK)
├── comment → Comment? (FK — for reporting comments)
└── createdAt, updatedAt
```

### User Roles

```
User.role: "user" | "themeMaintainer" | "admin"
```

Plus a new **ThemeMaintainer** join table:

```
ThemeMaintainer
├── user → User (FK)
├── theme → Theme (FK)
├── @@unique([userId, themeId])
└── assignedAt
```

---

## 4. URL Structure

```
/themes                                            → All themes list
/themes/[theme-slug]                               → Theme detail (tabs: Platforms, Colors, Guidelines)
/themes/[theme-slug]/[platform-slug]               → Ports of theme X for platform Y
/themes/[theme-slug]/[platform-slug]/[port-id]     → Specific port detail + comments

/platforms                                         → All platforms list
/platforms/[platform-slug]                         → Platform detail (tabs: Themes, Instructions, Docs)
/platforms/[platform-slug]/[theme-slug]            → Mirrors /themes/[theme]/[platform]
/platforms/[platform-slug]/[theme-slug]/[port-id]  → Mirrors /themes/[theme]/[platform]/[port-id]

/submit                                            → Submit a new port (multi-step wizard)
/suggest                                           → Suggest a new theme or platform
/search                                            → Full search results page
/dashboard                                         → User dashboard (ports, suggestions, likes)
/auth/login                                        → Login
```

### Content Mirroring Strategy

- `/themes/dracula/vscode` ↔ `/platforms/vscode/dracula` render identical content
- Implement via **shared components** — the route files import the same component tree, just swap the URL params
- Use `canonical` meta tag pointing to the `/themes/...` version for SEO

---

## 5. Page Layouts

### Homepage

- Hero section with search (find "theme for platform")
- Popular Ports (admin-curated via `isFeatured`)
- Popular Themes (admin-curated via `isFeatured`)
- Popular Platforms (admin-curated via `isFeatured`)

### `/themes/[theme-slug]` — Theme Detail

- Theme metadata (name, description, author, links)
- Tabbed layout:
  1. **Platforms** — grid of platforms this theme has ports for, with port count per platform
  2. **Color Palette** — swatches from `ColorPalette` model
  3. **Guidelines/Specs** — rendered markdown from `theme.guidelines`

### `/platforms/[platform-slug]` — Platform Detail

- Platform metadata
- Tabbed layout:
  1. **Themes** — grid of themes available for this platform, with port count per theme
  2. **Instructions** — rendered markdown from `platform.installInstructions`
  3. **Theme Docs** — rendered markdown from `platform.themeCreationDocs`

### `/themes/[theme]/[platform]/[port-id]` — Port Detail

- Port metadata, screenshot, install URL, repository link
- "Official" badge if `isOfficial`
- Like button, report button, share buttons
- Comments section (threaded)

### `/dashboard` — User Profile/Dashboard

- **My Ports** — ports the user submitted (with status badges)
- **My Suggestions** — theme/platform suggestions submitted
- **Liked** — liked ports, themes, platforms
- Edit own ports (triggers `PortEdit` for admin review)

### `/submit` — Submit Port (Multi-step Wizard)

- **Step 1:** Search and select theme (combobox with async search)
- **Step 2:** Search and select platform (combobox with async search)
- **Step 3:** Port details (name, description, repo URL, install URL, screenshot, markdown content with preview)
- **Step 4:** Review all data before submitting
- Zustand store for multi-step form state
- If theme/platform missing → link to `/suggest` from combobox empty states
- Duplicate submission check (same user + theme + platform with pending status)

### `/suggest` — Suggest Theme/Platform

- Radio: Theme or Platform
- Name, description, website URL
- Rate limited: max 5 per user per 24h
- Submit → creates `Suggestion` record

### `/search` — Full Search Results Page

- Displays categorized results: Themes, Platforms, Ports
- Uses Meilisearch for fast, relevant results
- Keyboard-accessible, permalink-friendly via `?q=` param

---

## 6. Admin Panel Changes

### Existing admin sections to **rename/repurpose**:

| Old                  | New               |
| -------------------- | ----------------- |
| Admin → Tools        | Admin → Ports     |
| Admin → Alternatives | Admin → Themes    |
| Admin → Categories   | Admin → Platforms |

### New admin sections:

- **Admin → Suggestions** — review/approve/reject theme and platform suggestions
- **Admin → Port Edits** — review/approve/reject pending port edits
- **Admin → Comments** — moderate comments (delete, hide)
- **Admin → Featured** — manage homepage featured ports/themes/platforms

### Admin → Themes

- CRUD for themes
- Manage color palette (add/edit/remove swatches)
- Assign theme maintainers
- Edit guidelines markdown

### Admin → Platforms

- CRUD for platforms
- Edit install instructions markdown
- Edit theme creation docs markdown

### Admin → Ports

- Review submitted ports (approve/reject with rejection reason/schedule)
- Review port edits (approve/reject)
- Set official port status (clears existing official for same theme+platform)
- Mark ports as featured
- Bulk actions

### Admin → Reports

- View open reports with entity type/id links
- Resolve or dismiss reports (tracks who resolved and when)

---

## 7. Authentication & Roles

Leverage existing Better Auth setup. Changes:

- Add `themeMaintainer` role concept (via `ThemeMaintainer` join table, not a global role)
- A user can be a theme maintainer for specific themes
- Theme maintainers can mark ports as "official" for their theme
- Admin can assign theme maintainer status

---

## 8. Email System

Repurpose existing Resend-based email templates:

| Email                | Trigger                      |
| -------------------- | ---------------------------- |
| Port Submitted       | User submits a port          |
| Port Approved        | Admin approves a port        |
| Port Rejected        | Admin rejects a port         |
| Suggestion Submitted | User suggests theme/platform |
| Suggestion Approved  | Admin approves suggestion    |
| Suggestion Rejected  | Admin rejects suggestion     |
| Port Edit Approved   | Admin approves an edit       |
| Port Edit Rejected   | Admin rejects an edit        |
| Report Acknowledged  | Admin reviews a report       |

---

## 9. Features to Remove

Only these features are removed:

- **Stacks** (StackType enum, Stack model) — remove entirely
- **Self-hosted** section — remove
- **Stack Analyzer** — remove

---

## 10. Features to Keep (adapted)

- **Search** — adapt Meilisearch to index ports, themes, platforms + `/search` results page
- **Ads system** — keep, adapt ad types
- **Like system** — expand to themes/platforms (currently "save", rename to "like")
- **Report system** — expand to themes/platforms/comments, add resolution workflow
- **SEO** — keep metadata generation, sitemaps, JSON-LD
- **Rate limiting** — keep for submissions, reports, suggestions (specific limits enforced)
- **S3 media** — keep for screenshots, favicons
- **OG images** — keep, adapt for new entities
- **Newsletter / Beehiiv** — keep as-is
- **Stripe / premium submissions** — keep, adapt for port submissions
- **Blog / content collections** — keep as-is
- **Social posting** (Twitter, Bluesky, Mastodon) — keep, adapt for new entities
- **AI features** — keep
- **Analytics** (Plausible + PostHog) — keep, add detailed custom events
- **License model** — keep, expand to themes and platforms
- **Repository details** — keep for ports that have repos
- **Contribution graph** — keep on homepage
- **Discount codes / affiliate URLs** — keep
- **Health check** — `/api/health` returning `{ status, timestamp, db }`

---

## 11. UI & Design Principles

> All new components MUST match the existing dirstarter design system.

- Reuse existing UI primitives from `components/common/` and `components/web/ui/`
- Follow the same layout patterns (Section, Intro, Card, Stack, etc.)
- Match existing color tokens, spacing, typography, and dark mode behavior
- New pages should feel native — indistinguishable from existing pages
- Keep the same responsive breakpoints and grid system
- **Shared Catalogue Pattern:** Shared components for themes/platforms/ports live in `components/catalogue/` — a shared namespace that prevents duplication between theme and platform views

---

## 12. Analytics Events (PostHog)

Detailed custom event tracking:

| Event                  | Trigger                   | Properties                            |
| ---------------------- | ------------------------- | ------------------------------------- |
| `port_viewed`          | Port detail page load     | `portId`, `themeSlug`, `platformSlug` |
| `port_liked`           | User likes a port         | `portId`, `themeSlug`, `platformSlug` |
| `theme_viewed`         | Theme detail page load    | `themeSlug`                           |
| `theme_liked`          | User likes a theme        | `themeSlug`                           |
| `platform_viewed`      | Platform detail page load | `platformSlug`                        |
| `platform_liked`       | User likes a platform     | `platformSlug`                        |
| `search_performed`     | User submits search       | `query`, `resultCount`                |
| `port_submitted`       | User submits a port       | `themeSlug`, `platformSlug`           |
| `suggestion_submitted` | User submits a suggestion | `type` (theme/platform)               |
| `repo_link_clicked`    | User clicks port repo URL | `portId`, `repositoryUrl`             |

---

## 13. Phased Implementation Roadmap

### Phase 1 — Foundation (Database + Core Config)

1. Design and write new Prisma schema
2. Create migration
3. Update `config/site.ts`, `config/links.ts`, and all config files
4. Update `env.ts` — remove Stack Analyzer env vars only
5. Update `package.json` — rename project

### Phase 2 — Server Layer (Queries, Payloads, Actions)

1. Create `server/web/themes/` (queries, payloads)
2. Create `server/web/platforms/` (queries, payloads)
3. Refactor `server/web/tools/` → `server/web/ports/` (queries, payloads)
4. Create `server/web/suggestions/` (queries)
5. Create `server/web/comments/` (queries)
6. Refactor `server/web/topics/` → `server/web/tags/`
7. Remove `server/web/stacks/` (keep `server/web/licenses/`)
8. Create `server/admin/themes/` (actions, queries, schema)
9. Create `server/admin/platforms/` (actions, queries, schema)
10. Refactor `server/admin/tools/` → `server/admin/ports/`
11. Create `server/admin/suggestions/` (actions, queries, schema)
12. Create `server/admin/port-edits/` (actions, queries, schema)
13. Create `server/admin/comments/` (actions, queries, schema)

### Phase 3 — Actions (Server Actions / Mutations)

1. Refactor `actions/submit.ts` → multi-step port submission with duplicate check
2. Create `actions/suggest.ts` — theme/platform suggestions (rate limited: 5/day)
3. Refactor `actions/report.ts` — expand for themes/platforms/comments, add resolution actions
4. Create `actions/comment.ts` — add/edit/delete comments
5. Create `actions/port-edit.ts` — submit port edits
6. Refactor `actions/filters.ts`, `actions/search.ts`
7. Adapt like action for ports/themes/platforms

### Phase 4 — Components

1. Create shared `components/catalogue/` — entity-header, entity-tabs, catalogue-grid, port-list, port-detail, markdown-content, URL builders
2. Create `components/catalogue/theme-card.tsx`, `platform-card.tsx`, `port-card.tsx`
3. Refactor `components/web/tools/` → `components/web/ports/`
4. Create `components/web/comments/` — comment thread, comment form
5. Create `components/web/suggestions/` — suggestion form
6. Create `components/web/color-palette/` — swatch display
7. Create `components/submission/` — multi-step wizard (step-theme, step-platform, step-details, step-review)
8. Create `components/analytics/` — page view events, source link button
9. Adapt `components/web/header.tsx` — new navigation (Themes, Platforms)
10. Adapt `components/web/footer.tsx`
11. Adapt `components/web/search-form.tsx` — "find theme for platform"
12. Remove stacks and self-hosted components only (keep newsletter, blog, etc.)

### Phase 5 — Routes (Pages)

1. Create `app/(web)/themes/` route group (list, detail, platform, port)
2. Create `app/(web)/platforms/` route group (list, detail, theme, port — mirrored, with URL param validation)
3. Refactor `app/(web)/(home)/` — new homepage layout
4. Refactor `app/(web)/submit/` — multi-step port submission wizard with Zustand store
5. Create `app/(web)/suggest/` — suggestion page
6. Create `app/(web)/search/` — full search results page
7. Refactor `app/(web)/dashboard/` — show ports, suggestions, likes
8. Create `app/api/health/` — health check endpoint
9. Remove: `alternatives/`, `categories/`, `stacks/`, `self-hosted/`
10. Keep: `auth/`, `blog/`, `topics/` (→ tags), `licenses/`, `advertise/`, `coming-soon/`

### Phase 6 — Admin Panel

1. Refactor `app/admin/tools/` → `app/admin/ports/`
2. Refactor `app/admin/alternatives/` → `app/admin/themes/`
3. Refactor `app/admin/categories/` → `app/admin/platforms/`
4. Create `app/admin/suggestions/` — review suggestions
5. Create `app/admin/port-edits/` — review port edits
6. Create `app/admin/comments/` — moderate comments
7. Add featured management to themes/platforms/ports
8. Add color palette management to theme admin
9. Add theme maintainer assignment UI

### Phase 7 — Emails

1. Refactor existing email templates for new entities
2. Create new templates for suggestions, port edits
3. Update notification lib functions

### Phase 8 — Search & Cron

1. Update Meilisearch index configuration for ports, themes, platforms
2. Refactor `functions/cron.*.ts` — remove GitHub analysis, add port/theme indexing
3. Update sitemap generation

### Phase 9 — Analytics & Health

1. Add PostHog custom events (all events from Section 12)
2. Create `components/analytics/page-view-event.tsx` and `components/analytics/source-link-button.tsx`
3. Create `app/api/health/route.ts`

### Phase 10 — Polish & Cleanup

1. Remove all dead code (stacks, self-hosted, stack analyzer only)
2. Update OG image generation for new entities
3. Final SEO audit (meta tags, canonical URLs, JSON-LD)
4. UI polish — ensure responsive design, hover states, animations
5. Clean up unused imports and references

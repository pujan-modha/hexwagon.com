# HexWagon — Exhaustive Implementation Plan

> **Goal:** Transform dirstarter (OpenAlternative) into HexWagon, a centralized theme aggregator.
> See [PLAN.md](file:///Users/pujan.pm/.gemini/antigravity/brain/e0441fd6-329c-49e7-9fbe-9671700f9408/PLAN.md) for the high-level plan.

> [!IMPORTANT]
> This plan is prescriptive. Every file to create/modify/delete has its absolute path, exact code template, and exact imports specified. Follow each phase sequentially. The codebase will be broken between phases until Phase 5.

> [!NOTE] > **Design System Constraint:** All new components MUST reuse existing UI primitives from `~/components/common/` (Button, Card, Badge, Heading, Icon, Input, Form, Stack, Link, Note) and `~/components/web/ui/` (Intro, IntroTitle, IntroDescription, Section, Tag, FaviconImage). Match existing color tokens, spacing, typography, and dark mode behavior.

> [!NOTE] > **Project Root:** `/Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter` > **Import Alias:** `~/` maps to root (configured in tsconfig.json)

---

## Existing Patterns Reference

Before modifying anything, understand these exact patterns used throughout the codebase:

### Pattern A: Prisma Payload (select objects)

```ts
// File: server/web/{entity}/payloads.ts
import { Prisma, PortStatus } from "@prisma/client";

export const entityManyPayload = Prisma.validator<Prisma.EntitySelect>()({
  id: true,
  name: true,
  slug: true,
  // ...fields...
  _count: { select: { ports: { where: { status: PortStatus.Published } } } },
});

export type EntityMany = Prisma.EntityGetPayload<{
  select: typeof entityManyPayload;
}>;
```

### Pattern B: Web Query (cached server functions)

```ts
// File: server/web/{entity}/queries.ts
import {
  unstable_cacheLife as cacheLife,
  unstable_cacheTag as cacheTag,
} from "next/cache";
import { db } from "~/services/db";

export const findEntities = async ({
  where,
  orderBy,
  ...args
}: Prisma.EntityFindManyArgs) => {
  "use cache";
  cacheTag("entities");
  cacheLife("max");
  return db.entity.findMany({
    ...args,
    where,
    orderBy,
    select: entityManyPayload,
  });
};
```

### Pattern C: Admin Schema (table params + Zod form schema)

```ts
// File: server/admin/{entity}/schema.ts
import type { Entity } from "@prisma/client";
import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server";
import { z } from "zod";
import { getSortingStateParser } from "~/lib/parsers";

export const entitiesTableParamsSchema = {
  name: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(25),
  sort: getSortingStateParser<Entity>().withDefault([
    { id: "name", desc: false },
  ]),
  from: parseAsString.withDefault(""),
  to: parseAsString.withDefault(""),
  operator: parseAsStringEnum(["and", "or"]).withDefault("and"),
};
export const entitiesTableParamsCache = createSearchParamsCache(
  entitiesTableParamsSchema,
);
export type EntitiesTableSchema = Awaited<
  ReturnType<typeof entitiesTableParamsCache.parse>
>;

export const entitySchema = z.object({
  /* fields */
});
export type EntitySchema = z.infer<typeof entitySchema>;
```

### Pattern D: Admin Action (server action with adminProcedure)

```ts
// File: server/admin/{entity}/actions.ts
"use server";
import { slugify } from "@primoui/utils";
import { revalidatePath, revalidateTag } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { removeS3Directories } from "~/lib/media";
import { adminProcedure } from "~/lib/safe-actions";
import { entitySchema } from "~/server/admin/{entity}/schema";
import { db } from "~/services/db";

export const upsertEntity = adminProcedure
  .createServerAction()
  .input(entitySchema)
  .handler(async ({ input: { id, ...input } }) => {
    const entity = id
      ? await db.entity.update({
          where: { id },
          data: { ...input, slug: input.slug || slugify(input.name) },
        })
      : await db.entity.create({
          data: { ...input, slug: input.slug || slugify(input.name) },
        });
    revalidateTag("entities");
    revalidateTag(`entity-${entity.slug}`);
    return entity;
  });

export const deleteEntities = adminProcedure
  .createServerAction()
  .input(z.object({ ids: z.array(z.string()) }))
  .handler(async ({ input: { ids } }) => {
    await db.entity.deleteMany({ where: { id: { in: ids } } });
    revalidatePath("/admin/entities");
    revalidateTag("entities");
    return true;
  });
```

### Pattern E: Safe Actions Procedures

```ts
// File: ~/lib/safe-actions.ts  (DO NOT MODIFY - reference only)
// userProcedure → requires authenticated session, returns { user }
// adminProcedure → extends userProcedure, requires user.role === "admin"
```

---

## Phase 1 — Foundation (Database + Config)

### 1.1 Prisma Schema

#### [MODIFY] [schema.prisma](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/prisma/schema.prisma)

**Step-by-step changes (apply in this exact order):**

**1. Remove these entirely:**

- Delete the `StackType` enum (lines 30-47)
- Delete the `Stack` model (lines 270-286)
- Delete the `ToolStatus` enum (lines 24-28)

**2. Rename `AdType` enum values:**

```prisma
enum AdType {
  Banner
  Themes
  ThemePage
  Platforms
  PlatformPage
  Ports
  PortPage
  All
}
```

This replaces the old `AdType` which had `Alternatives`, `AlternativePage`, `Tools`, `ToolPage`, `SelfHosted`, `BlogPost`.

**3. Add new enums (after AdType):**

```prisma
enum PortStatus {
  Draft
  Scheduled
  Published
  PendingEdit
}

enum SuggestionType {
  Theme
  Platform
}

enum SuggestionStatus {
  Pending
  Approved
  Rejected
}

enum EditStatus {
  Pending
  Approved
  Rejected
}

enum ReportStatus {
  Open
  Resolved
  Dismissed
}
```

**4. Update `ReportType` enum:**

```prisma
enum ReportType {
  BrokenLink
  Inappropriate
  Outdated
  Other
}
```

(Remove `WrongCategory`, `WrongAlternative`)

**5. Replace `User` model relations (keep all existing fields):**

```prisma
model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false)
  image         String?
  role          String    @default("user")
  banned        Boolean?  @default(false)
  banReason     String?
  banExpires    DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  accounts         Account[]
  sessions         Session[]
  likes            Like[]
  ports            Port[]
  reports          Report[]
  comments         Comment[]
  suggestions      Suggestion[]
  portEdits        PortEdit[]
  maintainedThemes ThemeMaintainer[]

  // Indexes
  @@index([id])
}
```

**6. Replace `Alternative` model with `Theme`:**
Delete the entire `Alternative` model and replace with:

```prisma
model Theme {
  id            String   @id @default(cuid())
  name          String   @db.Citext
  slug          String   @unique
  description   String?
  websiteUrl    String?
  repositoryUrl String?
  faviconUrl    String?
  author        String?
  authorUrl     String?
  guidelines    String?  @db.Text
  isFeatured    Boolean  @default(false)
  discountCode  String?
  discountAmount String?
  pageviews     Int?     @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  ports       Port[]
  colors      ColorPalette[]
  likes       Like[]
  reports     Report[]
  maintainers ThemeMaintainer[]
  license     License?  @relation(fields: [licenseId], references: [id])
  licenseId   String?
  ad          Ad?       @relation(fields: [adId], references: [id])
  adId        String?

  // Indexes
  @@index([slug])
  @@index([adId])
}
```

**7. Replace `Category` model with `Platform`:**
Delete the entire `Category` model and replace with:

```prisma
model Platform {
  id                  String   @id @default(cuid())
  name                String   @db.Citext
  slug                String   @unique
  description         String?  @db.Text
  websiteUrl          String?
  faviconUrl          String?
  installInstructions String?  @db.Text
  themeCreationDocs   String?  @db.Text
  isFeatured          Boolean  @default(false)
  pageviews           Int?     @default(0)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  // Relations
  ports   Port[]
  likes   Like[]
  reports Report[]
  license License? @relation(fields: [licenseId], references: [id])
  licenseId String?

  // Indexes
  @@index([slug])
}
```

**8. Replace `Tool` model with `Port`:**
Delete the entire `Tool` model and replace with:

```prisma
model Port {
  id            String     @id @default(cuid())
  slug          String     @unique
  name          String?    @db.Citext
  description   String?
  content       String?    @db.Text
  websiteUrl    String?
  repositoryUrl String?
  installUrl    String?
  screenshotUrl String?
  faviconUrl    String?
  isOfficial    Boolean    @default(false)
  isFeatured    Boolean    @default(false)
  isSelfHosted  Boolean    @default(false)
  score         Int        @default(0)
  stars         Int        @default(0)
  forks         Int        @default(0)
  pageviews     Int?       @default(0)
  submitterName   String?
  submitterEmail  String?
  submitterNote   String?
  discountCode    String?
  discountAmount  String?
  affiliateUrl    String?
  rejectionReason String?
  firstCommitDate DateTime?
  lastCommitDate  DateTime?
  status        PortStatus @default(Draft)
  publishedAt   DateTime?
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  // Relations
  theme        Theme    @relation(fields: [themeId], references: [id])
  themeId      String
  platform     Platform @relation(fields: [platformId], references: [id])
  platformId   String
  author       User?    @relation(fields: [authorId], references: [id])
  authorId     String?

  tags         Tag[]
  likes        Like[]
  comments     Comment[]
  reports      Report[]
  pendingEdits PortEdit[]
  license      License? @relation(fields: [licenseId], references: [id])
  licenseId    String?

  // Indexes
  @@index([id, slug])
  @@index([slug])
  @@index([themeId])
  @@index([platformId])
  @@index([authorId])
  @@index([status])
  @@index([isFeatured, score])

  // Only one official port per theme+platform pair
  @@unique([themeId, platformId, isOfficial], map: "unique_official_port")
}
```

> [!NOTE]
> Port keeps `stars`, `forks`, `websiteUrl`, `repositoryUrl`, `affiliateUrl`, `submitterName/Email/Note`, `discountCode/Amount`, `isSelfHosted`, `firstCommitDate`, `lastCommitDate` — these were kept per user's request to retain existing functionality.

**9. Rename `Topic` to `Tag`:**

```prisma
model Tag {
  slug      String   @id @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  ports Port[]

  // Indexes
  @@index([slug])
}
```

**10. Update `License` model — add Theme and Platform relations:**

```prisma
model License {
  id        String   @id @default(cuid())
  name      String   @unique @db.Citext
  slug      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  ports     Port[]
  themes    Theme[]
  platforms Platform[]

  // Indexes
  @@index([slug])
}
```

**11. Update `Ad` model — change relation from `alternatives Alternative[]` to `themes Theme[]`:**

```prisma
model Ad {
  // ... keep all existing fields ...
  // Change this relation:
  themes Theme[]   // was: alternatives Alternative[]
}
```

**12. Replace `Like` model:**

```prisma
model Like {
  id         String    @id @default(cuid())
  createdAt  DateTime  @default(now())

  // Relations
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId     String
  port       Port?     @relation(fields: [portId], references: [id], onDelete: Cascade)
  portId     String?
  theme      Theme?    @relation(fields: [themeId], references: [id], onDelete: Cascade)
  themeId    String?
  platform   Platform? @relation(fields: [platformId], references: [id], onDelete: Cascade)
  platformId String?

  // Indexes
  @@unique([userId, portId])
  @@unique([userId, themeId])
  @@unique([userId, platformId])
  @@index([userId])
  @@index([portId])
  @@index([themeId])
  @@index([platformId])
}
```

**13. Replace `Report` model:**

```prisma
model Report {
  id         String       @id @default(cuid())
  type       ReportType
  message    String?
  status     ReportStatus @default(Open)
  resolvedAt DateTime?
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @updatedAt

  // Relations
  user       User?      @relation("ReportCreator", fields: [userId], references: [id], onDelete: Cascade)
  userId     String?
  resolvedBy User?      @relation("ReportResolver", fields: [resolvedById], references: [id])
  resolvedById String?
  port       Port?      @relation(fields: [portId], references: [id], onDelete: Cascade)
  portId     String?
  theme      Theme?     @relation(fields: [themeId], references: [id], onDelete: Cascade)
  themeId    String?
  platform   Platform?  @relation(fields: [platformId], references: [id], onDelete: Cascade)
  platformId String?
  comment    Comment?   @relation(fields: [commentId], references: [id], onDelete: Cascade)
  commentId  String?

  // Indexes
  @@index([portId])
  @@index([themeId])
  @@index([platformId])
  @@index([commentId])
  @@index([status])
}
```

> [!NOTE]
> The User model needs two Report relations:
>
> ```prisma
> reports        Report[] @relation("ReportCreator")
> resolvedReports Report[] @relation("ReportResolver")
> ```
>
> And Comment needs: `reports Report[]`

**14. Add new models (append at end of file, before last closing):**

```prisma
model ColorPalette {
  id        String   @id @default(cuid())
  label     String
  hex       String
  order     Int      @default(0)
  theme     Theme    @relation(fields: [themeId], references: [id], onDelete: Cascade)
  themeId   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([themeId])
}

model Suggestion {
  id          String           @id @default(cuid())
  type        SuggestionType
  name        String
  description String?
  websiteUrl  String?
  status      SuggestionStatus @default(Pending)
  adminNote   String?
  submitter   User             @relation(fields: [submitterId], references: [id])
  submitterId String
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  @@index([submitterId])
  @@index([status])
}

model PortEdit {
  id         String     @id @default(cuid())
  diff       Json
  status     EditStatus @default(Pending)
  adminNote  String?
  port       Port       @relation(fields: [portId], references: [id], onDelete: Cascade)
  portId     String
  editor     User       @relation(fields: [editorId], references: [id])
  editorId   String
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt

  @@index([portId])
  @@index([editorId])
  @@index([status])
}

model Comment {
  id        String    @id @default(cuid())
  content   String    @db.Text
  author    User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId  String
  port      Port      @relation(fields: [portId], references: [id], onDelete: Cascade)
  portId    String
  parent    Comment?  @relation("CommentReplies", fields: [parentId], references: [id])
  parentId  String?
  replies   Comment[] @relation("CommentReplies")
  reports   Report[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([portId])
  @@index([authorId])
  @@index([parentId])
}

model ThemeMaintainer {
  id         String   @id @default(cuid())
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId     String
  theme      Theme    @relation(fields: [themeId], references: [id], onDelete: Cascade)
  themeId    String
  assignedAt DateTime @default(now())

  @@unique([userId, themeId])
  @@index([userId])
  @@index([themeId])
}
```

---

### 1.2 Config Files

#### [MODIFY] [site.ts](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/config/site.ts)

Change these values:

- `name: "HexWagon"`
- `slug: "hexwagon"`
- `tagline: "Theme Ports for Every Platform"`
- `description: "The definitive source for discovering, sharing, and managing color theme ports across applications and developer tools."`
- Keep `affiliateUrl` — update to HexWagon's URL when available

#### [MODIFY] [links.ts](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/config/links.ts)

- Update `family`, `toolsUsed`, `featured` arrays with HexWagon-relevant content
- Remove `selfHost` link
- Update social URLs to HexWagon accounts
- Update RSS feeds: `{ title: "Theme Ports", url: ... }`, `{ title: "Themes", url: ... }`

#### [MODIFY] [ads.ts](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/config/ads.ts)

- Update labels to match new `AdType` enum: `Themes`, `ThemePage`, `Platforms`, `PlatformPage`, `Ports`, `PortPage`

#### [MODIFY] [env.ts](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/env.ts)

- **Remove only:** `STACK_ANALYZER_API_URL` and `STACK_ANALYZER_API_KEY` from the `server` section and `runtimeEnv`
- **Keep everything else as-is**

#### [MODIFY] [.env.example](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/.env.example)

- Remove only the `# Stack Analyzer` section (lines 78-80)

#### [MODIFY] [package.json](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/package.json)

- Change `"name": "openalternative"` → `"name": "hexwagon"`
- Keep all dependencies as-is

### Phase 1 Verification

```bash
bun run db:generate   # Must succeed — Prisma client generates
```

---

## Phase 2 — Server Layer

### 2.1 Web Server — Themes

#### [NEW] [server/web/themes/payloads.ts](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/server/web/themes/payloads.ts)

Follow **Pattern A** from alternatives/payloads.ts. Create:

- `themeOnePayload` — includes: `id, name, slug, description, websiteUrl, repositoryUrl, faviconUrl, author, authorUrl, guidelines, isFeatured, discountCode, discountAmount, pageviews, licenseId, adId`; include `ad: { select: adOnePayload }`, `_count: { select: { ports: { where: { status: PortStatus.Published } } } }`, `colors: { select: colorPalettePayload, orderBy: { order: "asc" } }`, `maintainers: { select: { userId: true, user: { select: { id: true, name: true, image: true } } } }`, `license: true`
- `themeManyPayload` — includes: `id, name, slug, description, faviconUrl, isFeatured, _count: { select: { ports: { where: { status: PortStatus.Published } } } }`
- `colorPalettePayload` — includes: `id, label, hex, order`
- Export types: `ThemeOne`, `ThemeMany`

Import `adOnePayload` from `~/server/web/ads/payloads` (existing file).

#### [NEW] [server/web/themes/queries.ts](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/server/web/themes/queries.ts)

Follow **Pattern B** from alternatives/queries.ts. Create these functions:

- `searchThemes(search: FilterSchema, where?)` — paginated search with `cacheTag("themes")`, `cacheLife("max")`
- `findThemes({ where, orderBy, ...args }: Prisma.ThemeFindManyArgs)` — general find with cache
- `findThemeSlugs({ where, ...args })` — returns `{ slug, updatedAt }` for static generation
- `findTheme({ ...args }: Prisma.ThemeFindFirstArgs)` — single theme by slug with `cacheTag("theme", \`theme-${args.where?.slug}\`)`
- `findFeaturedThemes({ where, ...args })` — filter by `isFeatured: true`

### 2.2 Web Server — Platforms

#### [NEW] [server/web/platforms/payloads.ts](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/server/web/platforms/payloads.ts)

- `platformOnePayload` — includes: `id, name, slug, description, websiteUrl, faviconUrl, installInstructions, themeCreationDocs, isFeatured, pageviews, licenseId, license: true, _count: { select: { ports: { where: { status: PortStatus.Published } } } }`
- `platformManyPayload` — includes: `id, name, slug, description, faviconUrl, isFeatured, _count: ...`
- Export types: `PlatformOne`, `PlatformMany`

#### [NEW] [server/web/platforms/queries.ts](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/server/web/platforms/queries.ts)

Same pattern as themes. Create: `searchPlatforms`, `findPlatforms`, `findPlatformSlugs`, `findPlatform`, `findFeaturedPlatforms`.

### 2.3 Web Server — Ports (refactor from tools)

#### [MODIFY] Rename directory: `server/web/tools/` → `server/web/ports/`

#### [MODIFY] [server/web/ports/payloads.ts](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/server/web/ports/payloads.ts)

- Rename all `tool*` → `port*` (e.g., `toolOnePayload` → `portOnePayload`)
- Change `Prisma.ToolSelect` → `Prisma.PortSelect`, `Prisma.Tool$*Args` → `Prisma.Port$*Args`
- Replace `alternativeManyPayload` import → `themeManyPayload` from themes/payloads
- Replace `categoryManyPayload` import → `platformManyPayload` from platforms/payloads
- **Add** to `portOnePayload`: `theme: { select: themeManyPayload }`, `platform: { select: platformManyPayload }`, `author: { select: { id: true, name: true, image: true } }`, `isOfficial: true`
- Replace `stacks` relation with `tags` (from `~/server/web/tags/payloads`)
- Remove `alternatives` relation (themes are now a direct FK, not many-to-many)
- Update type exports: `ToolOne` → `PortOne`, `ToolMany` → `PortMany`, `ToolManyExtended` → `PortManyExtended`

#### [MODIFY] [server/web/ports/queries.ts](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/server/web/ports/queries.ts)

- Rename all `tool*`/`Tool*` → `port*`/`Port*`
- Change `db.tool.` → `db.port.`
- Change `ToolStatus` → `PortStatus`
- Change `cacheTag("tools")` → `cacheTag("ports")`, `cacheTag("tool", ...)` → `cacheTag("port", ...)`
- Update `FilterSchema` filter keys: `alternative` → `theme`, `category` → `platform`, `stack` → `tag`
- **Add** `findPortsByThemeAndPlatform(themeSlug, platformSlug, search)` — filters by both theme slug and platform slug
- Update `searchTools` → `searchPorts` — filter by `themeId`, `platformId` via slug lookups

### 2.4 Web Server — Tags (refactor from topics)

#### [MODIFY] Rename directory: `server/web/topics/` → `server/web/tags/`

- Rename `topicManyPayload` → `tagManyPayload`
- Change `Prisma.TopicSelect` → `Prisma.TagSelect`
- Change `db.topic.` → `db.tag.`
- Change `tools` → `ports` in relations
- Change `cacheTag("topics")` → `cacheTag("tags")`

### 2.5 Web Server — Other Changes

#### [DELETE] `server/web/stacks/` — delete entire directory (2 files: payloads.ts, queries.ts)

#### [KEEP] `server/web/licenses/` — keep as-is, update `tools` relation references to `ports`

#### [KEEP] `server/web/ads/` — keep as-is, update Alternative references to Theme

#### [KEEP] `server/web/users/` — keep as-is

#### [NEW] [server/web/comments/queries.ts](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/server/web/comments/queries.ts)

```ts
import {
  unstable_cacheLife as cacheLife,
  unstable_cacheTag as cacheTag,
} from "next/cache";
import { db } from "~/services/db";

export const findCommentsByPort = async (portId: string) => {
  "use cache";
  cacheTag("comments", `comments-${portId}`);
  cacheLife("hours");
  return db.comment.findMany({
    where: { portId, parentId: null },
    select: {
      id: true,
      content: true,
      createdAt: true,
      author: { select: { id: true, name: true, image: true } },
      replies: {
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: { select: { id: true, name: true, image: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const countCommentsByPort = async (portId: string) => {
  "use cache";
  cacheTag("comments", `comments-count-${portId}`);
  cacheLife("hours");
  return db.comment.count({ where: { portId } });
};
```

#### [NEW] [server/web/suggestions/queries.ts](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/server/web/suggestions/queries.ts)

```ts
import { db } from "~/services/db";

export const findSuggestionsByUser = async (userId: string) => {
  return db.suggestion.findMany({
    where: { submitterId: userId },
    orderBy: { createdAt: "desc" },
  });
};
```

#### [MODIFY] [server/web/shared/schema.ts](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/server/web/shared/schema.ts)

- In `filterParamsSchema`: rename `alternative` → `theme`, `category` → `platform`, `stack` → `tag`
- Rename `submitToolSchema` → `submitPortSchema` and change fields:
  - Keep: `name`, `submitterName`, `submitterEmail`, `submitterNote`, `newsletterOptIn`
  - Add: `themeId: z.string().min(1, "Theme is required")`, `platformId: z.string().min(1, "Platform is required")`
  - Change `websiteUrl` to optional, `repositoryUrl` to optional (ports may not have repos)
  - Add: `installUrl: z.string().url().optional().or(z.literal(""))`, `description: z.string().optional()`
- Add `submitSuggestionSchema`:
  ```ts
  export const submitSuggestionSchema = z.object({
    type: z.nativeEnum(SuggestionType),
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    websiteUrl: z.string().url().optional().or(z.literal("")),
  });
  ```
- Add `commentSchema`:
  ```ts
  export const commentSchema = z.object({
    content: z.string().min(1, "Comment cannot be empty").max(2000),
    portId: z.string().min(1),
    parentId: z.string().optional(),
  });
  ```
- Update type exports accordingly

---

### 2.6 Admin Server

#### [NEW] [server/admin/themes/schema.ts](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/server/admin/themes/schema.ts)

Follow **Pattern C** — model on `server/admin/alternatives/schema.ts`. Use `Theme` type.
Fields for `themeSchema`:

```ts
export const themeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  slug: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  repositoryUrl: z.string().url().optional().or(z.literal("")),
  description: z.string().optional(),
  faviconUrl: z.string().optional(),
  author: z.string().optional(),
  authorUrl: z.string().url().optional().or(z.literal("")),
  guidelines: z.string().optional(),
  isFeatured: z.boolean().default(false),
  discountCode: z.string().optional(),
  discountAmount: z.string().optional(),
  ports: z.array(z.string()).optional(),
});
```

#### [NEW] [server/admin/themes/queries.ts](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/server/admin/themes/queries.ts)

Follow **Pattern** from `server/admin/alternatives/queries.ts`. Create: `findThemes(search)`, `findThemeBySlug(slug)`, `findThemeList()`.

#### [NEW] [server/admin/themes/actions.ts](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/server/admin/themes/actions.ts)

Follow **Pattern D** from `server/admin/alternatives/actions.ts`. Create: `upsertTheme`, `deleteThemes`.

- Use `db.theme` instead of `db.alternative`
- `revalidateTag("themes")` instead of `"alternatives"`
- S3 path: `themes/${slug}` instead of `alternatives/${slug}`

#### [NEW] [server/admin/platforms/schema.ts](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/server/admin/platforms/schema.ts)

Follow **Pattern C** — model on `server/admin/categories/schema.ts`. Use `Platform` type.
Fields for `platformSchema`:

```ts
export const platformSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  slug: z.string().optional(),
  description: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  faviconUrl: z.string().optional(),
  installInstructions: z.string().optional(),
  themeCreationDocs: z.string().optional(),
  isFeatured: z.boolean().default(false),
  ports: z.array(z.string()).optional(),
});
```

#### [NEW] [server/admin/platforms/queries.ts](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/server/admin/platforms/queries.ts)

#### [NEW] [server/admin/platforms/actions.ts](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/server/admin/platforms/actions.ts)

Follow same patterns. `db.platform`, `revalidateTag("platforms")`, S3 path: `platforms/${slug}`.

#### [MODIFY] Rename directory: `server/admin/tools/` → `server/admin/ports/`

- In `schema.ts`: `Tool` → `Port`, `ToolStatus` → `PortStatus`, `toolSchema` → `portSchema`, `toolsTableParamsSchema` → `portsTableParamsSchema`
  - Add fields: `themeId: z.string().optional()`, `platformId: z.string().optional()`
  - Remove `alternatives` and `categories` array fields (replaced by `themeId`/`platformId`)
- In `queries.ts`: `db.tool` → `db.port`, function names `findTools` → `findPorts`, etc.
- In `actions.ts`: `upsertTool` → `upsertPort`, `deleteTools` → `deletePorts`, `db.tool` → `db.port`, `revalidateTag("tools")` → `revalidateTag("ports")`, `revalidatePath("/admin/tools")` → `revalidatePath("/admin/ports")`, S3 path `tools/` → `ports/`
  - Remove `analyzeToolStack` action entirely
  - Keep `fetchToolRepositoryData` → rename to `fetchPortRepositoryData`

#### [MODIFY] Rename: `server/admin/alternatives/` → `server/admin/themes/` (if not creating fresh — otherwise delete old and use new files above)

#### [MODIFY] Rename: `server/admin/categories/` → `server/admin/platforms/` (same approach)

#### [NEW] [server/admin/suggestions/schema.ts](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/server/admin/suggestions/schema.ts)

```ts
import type { Suggestion } from "@prisma/client";
import {
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server";
import { z } from "zod";
import { SuggestionStatus } from "@prisma/client";
import { getSortingStateParser } from "~/lib/parsers";

export const suggestionsTableParamsSchema = {
  name: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(25),
  sort: getSortingStateParser<Suggestion>().withDefault([
    { id: "createdAt", desc: true },
  ]),
  status: parseAsArrayOf(z.nativeEnum(SuggestionStatus)).withDefault([]),
  operator: parseAsStringEnum(["and", "or"]).withDefault("and"),
};
export const suggestionsTableParamsCache = createSearchParamsCache(
  suggestionsTableParamsSchema,
);
export type SuggestionsTableSchema = Awaited<
  ReturnType<typeof suggestionsTableParamsCache.parse>
>;
```

#### [NEW] [server/admin/suggestions/queries.ts](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/server/admin/suggestions/queries.ts)

#### [NEW] [server/admin/suggestions/actions.ts](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/server/admin/suggestions/actions.ts)

Actions: `approveSuggestion(id)`, `rejectSuggestion(id, note?)` — update status, send email notification

#### [NEW] `server/admin/port-edits/` — schema.ts, queries.ts, actions.ts (same patterns)

#### [NEW] `server/admin/comments/` — queries.ts, actions.ts (deleteComment action)

### Phase 2 Verification

```bash
bun run db:generate   # Must succeed
```

Type errors in pages/components are expected at this point.

---

## Phase 3 — Actions (Server Actions)

#### [MODIFY] [actions/submit.ts](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/actions/submit.ts)

- Rename `submitTool` → `submitPort`
- Change import: `submitToolSchema` → `submitPortSchema` from `~/server/web/shared/schema`
- Change `db.tool` → `db.port`
- Add `themeId` and `platformId` from input to the create data
- Generate slug from `${themeName}-${platformName}` pattern
- Set `authorId` from session if user is logged in
- **Add duplicate submission check:** Before creating, query `db.port.findFirst({ where: { themeId, platformId, authorId, status: "Draft" } })`. If found, throw error "You already have a pending submission for this theme+platform."
- Change `notifySubmitterOfToolSubmitted` → adapt to port notification

#### [NEW] [actions/suggest.ts](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/actions/suggest.ts)

```ts
"use server";
import { headers } from "next/headers";
import { createServerAction } from "zsa";
import { auth } from "~/lib/auth";
import { getIP, isRateLimited } from "~/lib/rate-limiter";
import { userProcedure } from "~/lib/safe-actions";
import { submitSuggestionSchema } from "~/server/web/shared/schema";
import { db } from "~/services/db";

export const submitSuggestion = userProcedure
  .createServerAction()
  .input(submitSuggestionSchema)
  .handler(async ({ input, ctx: { user } }) => {
    const ip = await getIP();
    if (await isRateLimited(`suggestion:${ip}`, "submission")) {
      throw new Error("Too many suggestions. Please try again later.");
    }
    return await db.suggestion.create({
      data: { ...input, submitterId: user.id },
    });
  });
```

#### [MODIFY] [actions/report.ts](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/actions/report.ts)

- Rename `reportTool` → `reportPort`, change `toolSlug` → `portSlug`, `db.report.create` data: `port: { connect: { slug: portSlug } }`
- Add `reportTheme`, `reportPlatform`, and `reportComment` — same pattern, connect by id/slug
- Add `resolveReport` and `dismissReport` admin actions:
  - `resolveReport(reportId)` — sets `status: "Resolved"`, `resolvedById: user.id`, `resolvedAt: new Date()`
  - `dismissReport(reportId)` — sets `status: "Dismissed"`, `resolvedById: user.id`, `resolvedAt: new Date()`

#### [NEW] [actions/comment.ts](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/actions/comment.ts)

Use `userProcedure`, input `commentSchema`, rate limit `comment:${ip}`, create via `db.comment.create`, `revalidateTag(\`comments-${portId}\`)`

#### [NEW] [actions/port-edit.ts](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/actions/port-edit.ts)

Use `userProcedure`, verify user is port author, create `PortEdit` record with JSON diff

#### [MODIFY] [actions/misc.ts](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/actions/misc.ts)

- Change `db.tool` → `db.port`, `ToolStatus` → `PortStatus`
- Change `indexTools` → `indexPorts`, `indexAlternatives` → `indexThemes`, `indexCategories` → `indexPlatforms`
- Update `fetchRepositoryData` to work with ports
- Keep `recalculatePricesData` — adapt for themes instead of alternatives

#### [MODIFY] [actions/search.ts](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/actions/search.ts)

- Update to search ports, themes, platforms

### Phase 3 Verification

```bash
bun run db:generate  # Ensure still passing
```

---

## Phase 4 — Components

> [!IMPORTANT]
> All new components must use the same imports and patterns as existing components in `components/web/tools/`, `components/web/alternatives/`, etc. Use `~/components/common/*` for UI primitives and `~/components/web/ui/*` for layout primitives.

### 4.1 Shared Catalogue Components (`components/catalogue/`)

These components are shared between theme and platform views to prevent code duplication.

#### [NEW] `components/catalogue/entity-header.tsx`

- Shared header for theme/platform detail pages
- Props: `{ name, description, externalUrl?, likeButton: ReactNode, reportButton: ReactNode, children? }`
- Server Component — interactive buttons passed as props (slots)

#### [NEW] `components/catalogue/entity-tabs.tsx`

- Shared tabs shell for theme/platform detail pages
- Props: `{ tabs: Array<{ value, label, content: ReactNode }> }`
- URL-synced tab state via `?tab=` searchParam (no client state, no hydration mismatch)

#### [NEW] `components/catalogue/catalogue-grid.tsx`

- Responsive grid for all list pages (themes, platforms, cross-listing tabs)
- Props: `{ children, emptyState: ReactNode }`

#### [NEW] `components/catalogue/catalogue-list-header.tsx`

- Header for `/themes` and `/platforms` list pages
- Props: `{ title, description, count }`

#### [NEW] `components/catalogue/port-list.tsx`

- Shared port listing used on both `/themes/[t]/[p]` and `/platforms/[p]/[t]`
- Props: `{ ports, themeSlug, platformSlug, routePrefix: 'themes' | 'platforms' }`
- Constructs correct hrefs based on `routePrefix` — single place that knows URL shape

#### [NEW] `components/catalogue/port-detail.tsx`

- Shared port detail used on both theme-rooted and platform-rooted routes
- Props: `{ port, canonicalUrl }`
- `canonicalUrl` is always the theme-rooted URL

#### [NEW] `components/catalogue/markdown-content.tsx`

- Server-side markdown renderer for `theme.guidelines`, `platform.themeCreationDocs`, `port.content`
- Uses `remark` + `rehype-sanitize` (server-only, zero client JS)

#### [NEW] `lib/catalogue.ts`

- URL builder utilities:
  - `themeHref(slug)` → `/themes/${slug}`
  - `themePlatformHref(themeSlug, platformSlug)` → `/themes/${themeSlug}/${platformSlug}`
  - `portHrefFromTheme(themeSlug, platformSlug, portId)` → `/themes/${themeSlug}/${platformSlug}/${portId}`
  - `platformHref(slug)` → `/platforms/${slug}`
  - `platformThemeHref(platformSlug, themeSlug)` → `/platforms/${platformSlug}/${themeSlug}`
  - `portHrefFromPlatform(platformSlug, themeSlug, portId)` → `/platforms/${platformSlug}/${themeSlug}/${portId}`
  - `canonicalPortHref(themeSlug, platformSlug, portId)` → always theme-rooted

### 4.2 Entity Cards

#### [NEW] `components/catalogue/theme-card.tsx`

- Color swatch strip, name, author, port count badge, like count
- Props: `{ theme, href }` — `href` injected by caller so card works under both routes

#### [NEW] `components/catalogue/platform-card.tsx`

- Platform icon, name, theme count badge, port count badge
- Props: `{ platform, href }`

#### [NEW] `components/catalogue/port-card.tsx`

- Title, description (truncated), source link, official badge, submitter, like count
- Props: `{ port, themeHref, platformHref }`

### 4.3 Theme-Specific Components

#### [NEW] `components/catalogue/theme-platforms-tab.tsx` — Wraps CatalogueGrid + PlatformCard

#### [NEW] `components/catalogue/theme-guidelines-tab.tsx` — Wraps MarkdownContent with theme empty state

#### [NEW] `components/catalogue/color-palette-tab.tsx` — Renders palette with click-to-copy hex

### 4.4 Platform-Specific Components

#### [NEW] `components/catalogue/platform-themes-tab.tsx` — Wraps CatalogueGrid + ThemeCard

#### [NEW] `components/catalogue/platform-theme-docs-tab.tsx` — Wraps MarkdownContent with platform empty state

### 4.5 Port Components (refactor from tools)

#### [MODIFY] Rename directory: `components/web/tools/` → `components/web/ports/`

Rename every file: `tool-*.tsx` → `port-*.tsx`. Inside each file:

- Rename all `Tool*` types → `Port*`
- Change imports from `~/server/web/tools/` → `~/server/web/ports/`
- Change `tool` variable names → `port`
- Add `theme` and `platform` badges to port-card
- **Delete:** `tool-alternatives.tsx`, `tool-stacks.tsx`
- **Keep and rename:** `tool-card.tsx`, `tool-list.tsx`, `tool-listing.tsx`, `tool-query.tsx`, `tool-actions.tsx`, `tool-entry.tsx`, `tool-badges.tsx`, `tool-filters.tsx`, `tool-hover-card.tsx`, `tool-refinement.tsx`, `tool-search.tsx`

### 4.6 Multi-Step Submission Wizard

#### [NEW] `components/submission/submission-wizard.tsx` — 4-step wizard shell with progress indicator

#### [NEW] `components/submission/step-theme.tsx` — Step 1: Combobox with async theme search

#### [NEW] `components/submission/step-platform.tsx` — Step 2: Combobox with async platform search

#### [NEW] `components/submission/step-details.tsx` — Step 3: Port details (markdown editor with preview)

#### [NEW] `components/submission/step-review.tsx` — Step 4: Final review before submit

#### [NEW] `stores/submission-store.ts` — Zustand store for wizard state (step, form values). Clears on success.

### 4.7 Analytics Components

#### [NEW] `components/analytics/page-view-event.tsx` — Client component that fires PostHog events on page load

#### [NEW] `components/analytics/source-link-button.tsx` — Wraps external links (install/repo) with click tracking

#### [NEW] `hooks/use-analytics.ts` — Custom hook wrapping PostHog capture with typed event names

### 4.8 Interaction Components

#### [NEW] `components/web/comments/comment-thread.tsx`

#### [NEW] `components/web/comments/comment-form.tsx`

#### [NEW] `components/web/suggestions/suggestion-form.tsx`

### 4.9 Layout Changes

#### [MODIFY] [header.tsx](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/components/web/header.tsx)

- Update nav items: `Themes` → `/themes`, `Platforms` → `/platforms`
- Remove: Alternatives, Categories, Stacks links

#### [MODIFY] [footer.tsx](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/components/web/footer.tsx)

- Update links and branding to HexWagon

#### [MODIFY] [search-form.tsx](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/components/web/search-form.tsx)

- Update to search "Find theme for platform"

### 4.10 Component Changes

- `components/web/stacks/` — **DELETE** entire directory
- `components/web/alternatives/` — **DELETE** (replaced by themes)
- `components/web/categories/` — **DELETE** (replaced by platforms)
- `components/web/verified-badge.tsx` → repurpose as "Official Port" badge
- **KEEP everything else** (newsletter, contribution-graph, repository-details, plan, price, discount, built-with, featured, etc.)

---

## Phase 5 — Routes (Pages)

> [!IMPORTANT]
> When creating new page files, follow the exact pattern from existing pages like `app/(web)/alternatives/(alternatives)/page.tsx` and `app/(web)/[slug]/page.tsx`. Use `generateStaticParams`, `generateMetadata`, and server component patterns.

### 5.1 Theme Routes

#### [NEW] `app/(web)/themes/(themes)/page.tsx` — List all themes (model on `alternatives/(alternatives)/page.tsx`)

#### [NEW] `app/(web)/themes/[slug]/page.tsx` — Theme detail with tabs (model on `alternatives/[slug]/page.tsx`)

#### [NEW] `app/(web)/themes/[slug]/[platform]/page.tsx` — Ports filtered by theme+platform

#### [NEW] `app/(web)/themes/[slug]/[platform]/[portId]/page.tsx` — Port detail + comments

- **URL param validation:** Fetch port by ID, then verify `port.theme.slug === params.slug` AND `port.platform.slug === params.platform`. If mismatch → return 404. This prevents valid port IDs from being accessed under wrong theme/platform URL paths.

### 5.2 Platform Routes (mirrors)

#### [NEW] `app/(web)/platforms/(platforms)/page.tsx` — List all platforms

#### [NEW] `app/(web)/platforms/[slug]/page.tsx` — Platform detail with tabs

#### [NEW] `app/(web)/platforms/[slug]/[theme]/page.tsx` — Mirrors `/themes/[theme]/[slug]` (import same `PortList` from `components/catalogue/port-list.tsx`)

#### [NEW] `app/(web)/platforms/[slug]/[theme]/[portId]/page.tsx` — Mirrors port detail (import same `PortDetail` from `components/catalogue/port-detail.tsx`)

- **URL param validation:** Same as theme-rooted route — verify slugs match
- **Canonical URL:** Always set `<link rel="canonical">` to theme-rooted URL via `canonicalPortHref()` from `lib/catalogue.ts`

For mirrored routes, both route files import the shared `PortList` and `PortDetail` components from `components/catalogue/`. The only difference is the `routePrefix` prop.

### 5.3 Modified Routes

#### [MODIFY] `app/(web)/(home)/page.tsx`

- Replace `AlternativePreview` with featured themes section
- Replace `ToolQuery` with featured ports section
- Add featured platforms section
- Keep hero, newsletter, contribution graph

#### [MODIFY] `app/(web)/submit/page.tsx` and `form.tsx`

- Replace single form with `<SubmissionWizard>` from `components/submission/`
- Auth-gated (redirect to login if not authenticated)
- Use Zustand store (`stores/submission-store.ts`) for multi-step state
- Empty states in theme/platform comboboxes link to `/suggest?type=theme` / `/suggest?type=platform`

#### [NEW] `app/(web)/suggest/page.tsx`

- Suggestion form for themes/platforms
- Accepts `?type=theme|platform` query param from submission wizard
- Rate limited: max 5 suggestions per user per 24h

#### [NEW] `app/(web)/search/page.tsx`

- Full search results page with categorized sections: Themes, Platforms, Ports
- Reads `?q=` query param, searches via Meilisearch
- `generateMetadata` with search query in title
- Permalink-friendly, keyboard-accessible

#### [MODIFY] `app/(web)/dashboard/`

- Add tabs: My Ports | My Suggestions | Liked Content
- Update `listing.tsx` to use `db.port` instead of `db.tool`

#### [NEW] `app/api/health/route.ts`

- Health check endpoint returning `{ status: "ok", timestamp, db: "ok" }`
- DB ping via simple Prisma query (`db.$queryRaw\`SELECT 1\``)
- Returns 200 (healthy) or 503 (unhealthy)

### 5.4 Routes to Delete

- `app/(web)/alternatives/` — **DELETE**
- `app/(web)/categories/` — **DELETE**
- `app/(web)/stacks/` — **DELETE**
- `app/(web)/self-hosted/` — **DELETE**
- `app/(web)/[slug]/` — **DELETE** (tool detail — replaced by port routes)

### 5.5 Routes to Keep (adapt references)

- `app/(web)/auth/` — keep as-is
- `app/(web)/blog/` — keep as-is
- `app/(web)/topics/` → rename to `app/(web)/tags/` or adapt
- `app/(web)/licenses/` — keep, update Tool references to Port
- `app/(web)/advertise/` — keep, update ad types
- `app/(web)/coming-soon/` — keep
- `app/(web)/about/` — keep, update content

### Phase 5 Verification

```bash
bun run dev    # App starts without crashes
bun run build  # Production build succeeds
```

Then manually navigate: `/`, `/themes`, `/themes/[slug]`, `/platforms`, `/platforms/[slug]`, `/submit`, `/suggest`, `/dashboard`

---

## Phase 6 — Admin Panel

#### [MODIFY] Rename: `app/admin/tools/` → `app/admin/ports/`

- Rename all files inside `_components/`: `tool-*` → `port-*`
- Update all imports and references
- Update data table columns for port-specific fields (add theme, platform columns)
- Add reject with `rejectionReason` field in port form
- Add "Set Official" button — calls `setOfficialPort(portId)` which:
  1. Clears existing official port for same theme+platform: `db.port.updateMany({ where: { themeId, platformId, isOfficial: true }, data: { isOfficial: false } })`
  2. Sets new port as official: `db.port.update({ where: { id }, data: { isOfficial: true } })`

#### [MODIFY] Rename: `app/admin/alternatives/` → `app/admin/themes/`

- Rename `_components/alternative-*` → `theme-*`
- Add color palette management UI (inline table of swatches)
- Add theme maintainer assignment section
- Add guidelines markdown editor

#### [MODIFY] Rename: `app/admin/categories/` → `app/admin/platforms/`

- Rename `_components/category-*` → `platform-*`
- Remove hierarchy fields (parentId, fullPath)
- Add markdown editors for installInstructions and themeCreationDocs

#### [NEW] `app/admin/suggestions/` — full admin CRUD page with data table

#### [NEW] `app/admin/port-edits/` — review pending edits page

#### [NEW] `app/admin/comments/` — comment moderation page

#### [MODIFY] `app/admin/reports/` — update for resolution workflow

- Add "Resolve" and "Dismiss" buttons with admin actions
- Show entity type links (port/theme/platform/comment)
- Display `resolvedBy` and `resolvedAt` on resolved reports
- Filter by status (Open/Resolved/Dismissed)

#### [MODIFY] [app/admin/layout.tsx](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/app/admin/layout.tsx)

- Update sidebar nav: Ports, Themes, Platforms, Suggestions, Port Edits, Comments, Reports

#### [MODIFY] [app/admin/page.tsx](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/app/admin/page.tsx)

- Update dashboard stats cards for new entities (include pending port count, open report count)

---

## Phase 7 — Emails

#### [MODIFY] `emails/submission.tsx` → rename to `emails/port-submitted.tsx`

- Update `Tool` references to `Port`

#### [MODIFY] `emails/submission-published.tsx` → rename to `emails/port-approved.tsx`

#### [MODIFY] `emails/submission-scheduled.tsx` → rename to `emails/port-scheduled.tsx`

#### [NEW] `emails/port-rejected.tsx`

#### [NEW] `emails/suggestion-submitted.tsx`

#### [NEW] `emails/suggestion-approved.tsx`

#### [NEW] `emails/suggestion-rejected.tsx`

#### [NEW] `emails/port-edit-approved.tsx`

#### [NEW] `emails/port-edit-rejected.tsx`

#### [MODIFY] [lib/notifications.ts](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/lib/notifications.ts)

- Rename all `Tool` → `Port` references
- Rename `notifySubmitterOfToolSubmitted` → `notifySubmitterOfPortSubmitted`
- Rename `notifySubmitterOfToolPublished` → `notifySubmitterOfPortApproved`
- Rename `notifySubmitterOfToolScheduled` → `notifySubmitterOfPortScheduled`
- Add: `notifySubmitterOfSuggestionApproved`, `notifySubmitterOfSuggestionRejected`
- Add: `notifyEditorOfPortEditApproved`, `notifyEditorOfPortEditRejected`

---

## Phase 8 — Search & Cron

#### [MODIFY] [lib/indexing.ts](file:///Users/pujan.pm/workspace/github.com/pujan-modha/dirstarter/lib/indexing.ts)

- `indexTools` → `indexPorts` — index Port model
- `indexAlternatives` → `indexThemes` — index Theme model
- `indexCategories` → `indexPlatforms` — index Platform model

#### [MODIFY] `functions/cron.*.ts`

- `cron.analyze-tools.ts` — update `db.tool` → `db.port`, or remove stack analysis
- `cron.fetch-data.ts` — update `db.tool` → `db.port`
- `cron.index-data.ts` — update to index ports, themes, platforms
- `cron.publish-tools.ts` — rename to `cron.publish-ports.ts`, update `db.tool` → `db.port`, `ToolStatus` → `PortStatus`

#### [MODIFY] `next-sitemap.config.js`

- Add `/themes/*`, `/platforms/*` paths
- Remove `/alternatives/*`, `/categories/*`, `/stacks/*`

#### [MODIFY] `lib/tools.ts` → rename to `lib/ports.ts`

- Rename `getToolSuffix` → `getPortSuffix`
- Rename `isToolPublished` → `isPortPublished`
- Update `ToolStatus` → `PortStatus`

---

## Phase 9 — Analytics & Health

### 9.1 PostHog Custom Events

#### [NEW] `hooks/use-analytics.ts`

```ts
import posthog from "posthog-js";

type AnalyticsEvent =
  | {
      event: "port_viewed";
      properties: { portId: string; themeSlug: string; platformSlug: string };
    }
  | {
      event: "port_liked";
      properties: { portId: string; themeSlug: string; platformSlug: string };
    }
  | { event: "theme_viewed"; properties: { themeSlug: string } }
  | { event: "theme_liked"; properties: { themeSlug: string } }
  | { event: "platform_viewed"; properties: { platformSlug: string } }
  | { event: "platform_liked"; properties: { platformSlug: string } }
  | {
      event: "search_performed";
      properties: { query: string; resultCount: number };
    }
  | {
      event: "port_submitted";
      properties: { themeSlug: string; platformSlug: string };
    }
  | {
      event: "suggestion_submitted";
      properties: { type: "theme" | "platform" };
    }
  | {
      event: "repo_link_clicked";
      properties: { portId: string; repositoryUrl: string };
    };

export const trackEvent = ({ event, properties }: AnalyticsEvent) => {
  posthog.capture(event, properties);
};
```

#### [NEW] `components/analytics/page-view-event.tsx`

- Client component wrapping `useEffect` to fire view events on mount

#### [NEW] `components/analytics/source-link-button.tsx`

- Wraps repository external links with `repo_link_clicked` events

Wire these into:

- Port detail page → `port_viewed`
- Theme detail page → `theme_viewed`
- Platform detail page → `platform_viewed`
- Like actions → `*_liked` events
- Search results → `search_performed`
- Submit flow → `port_submitted`
- Suggest flow → `suggestion_submitted`

### 9.2 Health Check

#### [NEW] `app/api/health/route.ts`

```ts
import { NextResponse } from "next/server";
import { db } from "~/services/db";
import { tryCatch } from "~/utils/helpers";

export const GET = async () => {
  const { error } = await tryCatch(db.$queryRaw`SELECT 1`);
  if (error) {
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        db: "unreachable",
      },
      { status: 503 },
    );
  }
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    db: "ok",
  });
};
```

---

## Phase 10 — Polish & Cleanup

### Dead Code Removal

- `lib/stack-analysis.ts` — **DELETE**
- Remove `stacks` references from remaining files (grep for "stack" in server/, components/, app/)
- Remove `isSelfHosted` page/section references (keep the field, remove the `/self-hosted` page)
- Remove `Alternative`, `Category`, `Tool` references from any remaining files

### Global Search & Replace

Run these searches across the entire codebase to find missed references:

- `Alternative` → `Theme` (in types, imports, variable names)
- `alternative` → `theme` (in db queries, cache tags, slugs)
- `Category` → `Platform`
- `category` → `platform`
- `Tool` → `Port` (careful: not in node_modules)
- `tool` → `port` (in db queries, variable names — case sensitive)
- `ToolStatus` → `PortStatus`
- `openalternative` → `hexwagon`
- `OpenAlternative` → `HexWagon`

### OG Images

- Update `components/web/og/` templates for Port, Theme, Platform entities

### SEO

- Canonical URLs on mirrored routes (`/platforms/[p]/[t]`) point to `/themes/[t]/[p]`
- JSON-LD structured data for ports, themes, platforms
- Meta descriptions auto-generated

### UI Polish

- Responsive design audit
- Dark mode verification
- All new components use existing design system primitives
- Animation/transition review

### Phase 10 Verification

```bash
bun run build      # Clean production build
bun run typecheck  # Zero type errors
bun run lint       # Zero lint errors
bun run dev        # Manual testing of all pages
```

---

## File Reference Quick Lookup

| Old Path                          | New Path                    | Action                         |
| --------------------------------- | --------------------------- | ------------------------------ |
| `prisma/schema.prisma`            | same                        | MODIFY (complete rewrite)      |
| `config/site.ts`                  | same                        | MODIFY (rebrand)               |
| `config/links.ts`                 | same                        | MODIFY (update links)          |
| `config/ads.ts`                   | same                        | MODIFY (update ad types)       |
| `env.ts`                          | same                        | MODIFY (remove STACK_ANALYZER) |
| `.env.example`                    | same                        | MODIFY (remove STACK_ANALYZER) |
| `package.json`                    | same                        | MODIFY (rename)                |
| `server/web/tools/`               | `server/web/ports/`         | RENAME + MODIFY                |
| `server/web/alternatives/`        | `server/web/themes/`        | RENAME + MODIFY                |
| `server/web/categories/`          | `server/web/platforms/`     | RENAME + MODIFY                |
| `server/web/topics/`              | `server/web/tags/`          | RENAME + MODIFY                |
| `server/web/stacks/`              | _(deleted)_                 | DELETE                         |
| `server/web/comments/`            | _(new)_                     | NEW                            |
| `server/web/suggestions/`         | _(new)_                     | NEW                            |
| `server/admin/tools/`             | `server/admin/ports/`       | RENAME + MODIFY                |
| `server/admin/alternatives/`      | `server/admin/themes/`      | RENAME + MODIFY                |
| `server/admin/categories/`        | `server/admin/platforms/`   | RENAME + MODIFY                |
| `server/admin/suggestions/`       | _(new)_                     | NEW                            |
| `server/admin/port-edits/`        | _(new)_                     | NEW                            |
| `server/admin/comments/`          | _(new)_                     | NEW                            |
| `actions/submit.ts`               | same                        | MODIFY                         |
| `actions/suggest.ts`              | _(new)_                     | NEW                            |
| `actions/report.ts`               | same                        | MODIFY                         |
| `actions/comment.ts`              | _(new)_                     | NEW                            |
| `actions/port-edit.ts`            | _(new)_                     | NEW                            |
| `actions/misc.ts`                 | same                        | MODIFY                         |
| `components/web/tools/`           | `components/web/ports/`     | RENAME + MODIFY                |
| `components/web/alternatives/`    | _(deleted)_                 | DELETE                         |
| `components/web/categories/`      | _(deleted)_                 | DELETE                         |
| `components/web/stacks/`          | _(deleted)_                 | DELETE                         |
| `components/catalogue/`           | _(new)_                     | NEW                            |
| `components/submission/`          | _(new)_                     | NEW                            |
| `components/analytics/`           | _(new)_                     | NEW                            |
| `components/web/comments/`        | _(new)_                     | NEW                            |
| `components/web/suggestions/`     | _(new)_                     | NEW                            |
| `lib/catalogue.ts`                | _(new)_                     | NEW                            |
| `stores/submission-store.ts`      | _(new)_                     | NEW                            |
| `hooks/use-analytics.ts`          | _(new)_                     | NEW                            |
| `app/(web)/alternatives/`         | _(deleted)_                 | DELETE                         |
| `app/(web)/categories/`           | _(deleted)_                 | DELETE                         |
| `app/(web)/stacks/`               | _(deleted)_                 | DELETE                         |
| `app/(web)/self-hosted/`          | _(deleted)_                 | DELETE                         |
| `app/(web)/[slug]/`               | _(deleted)_                 | DELETE                         |
| `app/(web)/themes/`               | _(new)_                     | NEW                            |
| `app/(web)/platforms/`            | _(new)_                     | NEW                            |
| `app/(web)/suggest/`              | _(new)_                     | NEW                            |
| `app/(web)/search/`               | _(new)_                     | NEW                            |
| `app/api/health/`                 | _(new)_                     | NEW                            |
| `app/admin/tools/`                | `app/admin/ports/`          | RENAME + MODIFY                |
| `app/admin/alternatives/`         | `app/admin/themes/`         | RENAME + MODIFY                |
| `app/admin/categories/`           | `app/admin/platforms/`      | RENAME + MODIFY                |
| `app/admin/suggestions/`          | _(new)_                     | NEW                            |
| `app/admin/port-edits/`           | _(new)_                     | NEW                            |
| `app/admin/comments/`             | _(new)_                     | NEW                            |
| `lib/tools.ts`                    | `lib/ports.ts`              | RENAME + MODIFY                |
| `lib/catalogue.ts`                | _(new)_                     | NEW                            |
| `lib/notifications.ts`            | same                        | MODIFY                         |
| `lib/indexing.ts`                 | same                        | MODIFY                         |
| `lib/stack-analysis.ts`           | _(deleted)_                 | DELETE                         |
| `emails/submission.tsx`           | `emails/port-submitted.tsx` | RENAME + MODIFY                |
| `emails/submission-published.tsx` | `emails/port-approved.tsx`  | RENAME + MODIFY                |
| `emails/submission-scheduled.tsx` | `emails/port-scheduled.tsx` | RENAME + MODIFY                |

# HexWagon

HexWagon is theme-port directory built with Next.js App Router. It helps users discover theme
ports across platforms like VS Code, Ghostty, Neovim, Zed, and more.

## Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Prisma
- Better Auth
- Bun

## Project Structure

- `/app` - routes, layouts, API handlers
- `/components` - reusable UI and feature components
- `/lib` - shared business logic and helpers
- `/actions` - server actions
- `/services` - external service integrations
- `/server` - server-only queries, schemas, actions
- `/config` - app configuration and metadata
- `/content` - content source files
- `/emails` - React Email templates
- `/prisma` - schema and migrations
- `/docs` - project docs

## Development

Install dependencies:

```bash
bun install
```

Create local env file:

```bash
cp .env.example .env.local
```

Start local dependencies if needed:

```bash
docker compose up -d
```

Apply Prisma schema:

```bash
bun run db:push
```

Start dev server:

```bash
bun run dev
```

App runs on `http://localhost:5173`.

## Environment Variables

See [.env.example](.env.example) for full template.

Some integrations are optional for local development depending on which flows you want to test,
but production expects full configuration.

## Commands

| Command                | Action                                 |
| :--------------------- | :------------------------------------- |
| `bun run dev`          | Start dev server on port `5173`        |
| `bun run build`        | Build production app                   |
| `bun run start`        | Start production server                |
| `bun run lint`         | Run Biome checks with writes           |
| `bun run format`       | Format project with Biome              |
| `bun run typecheck`    | Run TypeScript typecheck               |
| `bun run icons`        | Rebuild generated icon assets          |
| `bun run db:generate`  | Generate Prisma client                 |
| `bun run db:migrate`   | Run Prisma dev migrations              |
| `bun run db:deploy`    | Apply Prisma migrations                |
| `bun run db:studio`    | Open Prisma Studio                     |
| `bun run db:push`      | Push Prisma schema without migration   |
| `bun run db:reset`     | Reset database via Prisma              |
| `bun run search:reindex` | Reindex search data                  |

## Deployment

Primary target is Vercel.

Build locally:

```bash
bun run build
```

Run production server locally:

```bash
bun run start
```

## Attribution

HexWagon is based on [OpenAlternative](https://github.com/piotrkulpinski/openalternative)'s open
source code.

That upstream repository no longer includes original codebase. Last snapshot of GPL-3.0 licensed
code used as reference is available here:
[pujan-modha/openalternative](https://github.com/pujan-modha/openalternative).

## License

HexWagon is licensed under the [GPL-3.0 License](LICENSE).

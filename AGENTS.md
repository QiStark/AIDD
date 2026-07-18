# AGENTS.md

Repo-specific guidance for OpenCode sessions working on this Next.js blog.

## Commands

- Install: `pnpm install` (README uses pnpm; a `pnpm-lock.yaml` is present)
- Dev: `pnpm dev` → http://localhost:3000 (note: `basePath` is `/MyBlog`, see below)
- Build: `pnpm build` → static export in `out/`
- Lint: `pnpm lint` (runs `next lint`, ESLint `next/core-web-vitals` + `next/typescript`)
- No test suite exists — there is no `test` script and no test framework configured.

Lockfile quirk: both `pnpm-lock.yaml` and `package-lock.json` exist. The CI workflow (`.github/workflows/nextjs.yml`) detects `yarn.lock` → falls back to `package-lock.json` and runs `npm ci`. Keep this in mind when adding dependencies — prefer pnpm, but be aware CI builds with npm.

## Architecture

Static-export Next.js 14 App Router blog hosted on GitHub Pages.

- `next.config.js`: `output: 'export'`, `basePath: '/MyBlog'`, `assetPrefix: '/MyBlog/'`, images unoptimized. **All internal links and asset paths must account for the `/MyBlog` basePath.** Use `next/link` (auto-prefixes) rather than raw `<a href="/...">`.
- Content is file-based (no DB, no CMS). Markdown files live in `content/`:
  - `content/posts/` — filenames **must** match `YYYY-MM-DD-<slug>.md`; the full `${date}-${slug}` becomes the URL (`/posts/YYYY-MM-DD-<slug>`). Enforced by regex in `src/lib/markdown.ts:74` — invalid names throw at request time, not build time.
  - `content/project/` — `index.md` is the entry.
  - `content/about.md`
- Markdown rendering pipeline (`src/lib/markdown.ts`): remark-parse → `remarkQQMusic` (custom, `[qqmusic:<id>]` tag) → remark-math → remark-gfm → remark-rehype (`allowDangerousHtml: true`) → rehype-prism-plus (line numbers, ignoring missing languages) → rehype-img-size (resolves images against `public/`) → rehype-katex → rehype-stringify. HTML in posts is passed through.
- Site/personal config including `siteUrl` lives in `src/config/self.config.ts`. Change author/url here, not in layout.
- `@/*` path alias → `./src/*` (`tsconfig.json`). Tailwind `darkMode: 'class'` with `@tailwindcss/typography` for prose; custom dark prose palette in `tailwind.config.ts`.

## Conventions

- Named post frontmatter: `title`, `tags`. `tags` may be a YAML list or a single string split on commas/whitespace (`parseTags` in `markdown.ts`).
- Chinese-language content and UI; commit messages / docs are mixed zh/en. Match surrounding tone.
- Adding a new post: drop a `<YYYY-MM-DD>-<slug>.md` file in `content/posts/` with frontmatter and body — no registration step. Sorting is by date descending.

## Deploy

Pushes to `main` trigger `.github/workflows/nextjs.yml`: `npm ci` → `next build` → creates `out/.nojekyll` → upload → GitHub Pages. No manual deploy step.
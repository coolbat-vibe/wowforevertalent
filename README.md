# WoW Forever Talent Calculator

Independent fan-made talent planner for World of Warcraft: Forever. Not affiliated with or endorsed by Blizzard Entertainment. Talent data from [talentsforever.com](https://talentsforever.com/) (CC BY 4.0).

Stack: Astro (static) + React + TypeScript + versioned JSON snapshots. See `doc/wowforevertalent-research-prd-development-plan.md` for the full PRD.

## Commands

```bash
npm install          # install dependencies
npm run data:import  # normalize data-raw/talentsforever-data.json → public/data snapshots
npm run dev          # local dev server
npm run build        # data:import + static build → dist/
npm run preview      # serve the production build locally (port 4321)
npm test             # Vitest: rules engine, share codec, data contract, island smoke
npm run test:e2e     # Playwright: key browser flows + SEO acceptance (needs dist/, auto-starts preview)
```

## Architecture

- `src/domain/talents/` — pure rules engine (budget, row gates, prerequisites, transactional actions, compare). No UI, no I/O.
- `src/domain/sharing/` — share payload codec (Base64URL JSON in `#b=` fragment, versioned schema).
- `src/features/builds/` — localStorage drafts and named builds.
- `src/features/compare/` — same-snapshot A/B comparison island.
- `src/components/calculator/` — the calculator island (desktop trees + mobile tabs/detail panel).
- `src/pages/` — Astro routes (home, 9 class calculators, 9 reference pages, changes, sources, about, privacy, compare, my-builds, 404).
- `public/data/` — immutable content-hashed snapshots + manifest. Old snapshots are never overwritten.

## Deployment (Cloudflare Pages)

- Build command: `npm run build`
- Output directory: `dist`
- Bind `wowforevertalentcalculator.com`; decide trailing-slash and www policy once.
- Preview deployments must be noindex; verify real HTTP responses after deploy.

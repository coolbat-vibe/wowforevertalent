# Asset Inventory

## Key art (`public/images/`)

- **`hero-forever.jpg`** — official World of Warcraft: Forever key art, sourced from the CN official site CDN (`nie.res.netease.com`, wow.blizzard.cn/forever, fetched 2026-09-16; same artwork appears in Blizzard's EN announcement). Used as the home hero background and on the Wiki page. Blizzard Entertainment game art; fan-made site identifies the game with it, no ownership claimed. Delete the file to fall back to the plain gradient hero.
- **Policy**: bundled locally (no hotlinking).

## Talent / class / tree icons (`public/icons/`)

- **What**: 384 JPG icons (9 class, 25 tree, 350 talent), ~1.5 MB total.
- **Source**: Wowhead icon CDN (`https://wow.zamimg.com/images/wow/icons/large/<name>.jpg`), fetched 2026-09-15 by `scripts/data/fetch-icons.mjs`. Icon names come from the talentsforever.com data export (CC BY 4.0).
- **Rights**: These are Blizzard Entertainment game assets. This site is an independent fan-made tool, not affiliated with or endorsed by Blizzard Entertainment (see site footer). Icons are used to identify game content for players; no ownership is claimed. If a takedown is requested, delete `public/icons/` — the UI falls back to letter tiles automatically.
- **Inventory digest**: see `public/icons/inventory.json`.
- **Policy**: icons are bundled locally (no hotlinking); new snapshots that introduce new icon names require re-running `node scripts/data/fetch-icons.mjs`.

## Talent data

See `src/data/snapshots` pipeline and the site Sources page — talentsforever.com export, CC BY 4.0, attribution in footer and Sources page.

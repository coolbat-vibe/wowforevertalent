/**
 * Fetch talent/class/tree icons from the Wowhead icon CDN into public/icons.
 * Icon names come from the normalized snapshots (iconRef fields).
 * Assets are Blizzard game icons used for a fan-made tool; see ASSETS.md.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(root, 'public/icons');
const CDN = 'https://wow.zamimg.com/images/wow/icons/large';
const CONCURRENCY = 8;
const UA = { 'User-Agent': 'Mozilla/5.0 (fan-made talent planner asset sync)' };

const manifest = JSON.parse(
  await readFile(path.join(root, 'public/data/manifest.json'), 'utf8'),
);

const names = { talents: new Set(), classes: new Set(), trees: new Set() };
for (const c of manifest.classes) {
  const snap = JSON.parse(await readFile(path.join(root, 'public', c.path), 'utf8'));
  names.classes.add(snap.classDef.iconRef);
  for (const tree of snap.trees) {
    // tree icons are stored per talent snapshot? fall back to first talent icon
  }
  for (const t of snap.talents) names.talents.add(t.iconRef);
}

// Tree icons: read from raw export (kept out of the snapshot by design).
const raw = JSON.parse(
  await readFile(path.join(root, 'data-raw/talentsforever-data.json'), 'utf8'),
);
for (const classData of Object.values(raw.talents)) {
  for (const tree of classData.trees) {
    if (tree.icon) names.trees.add(tree.icon);
  }
}

async function fetchOne(kind, name) {
  const dir = path.join(OUT, kind);
  const file = path.join(dir, `${name}.jpg`);
  try {
    await access(file);
    return { name, status: 'cached' };
  } catch {
    /* need download */
  }
  const res = await fetch(`${CDN}/${name}.jpg`, { headers: UA });
  if (!res.ok) return { name, status: `http-${res.status}` };
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 100) return { name, status: 'suspicious-size' };
  await writeFile(file, buf);
  return { name, status: 'ok' };
}

async function fetchAll(kind, set) {
  await mkdir(path.join(OUT, kind), { recursive: true });
  const list = [...set];
  const results = [];
  for (let i = 0; i < list.length; i += CONCURRENCY) {
    const batch = await Promise.all(list.slice(i, i + CONCURRENCY).map((n) => fetchOne(kind, n)));
    results.push(...batch);
  }
  return results;
}

const report = {};
for (const kind of ['classes', 'trees', 'talents']) {
  const results = await fetchAll(kind, names[kind]);
  const failed = results.filter((r) => r.status !== 'ok' && r.status !== 'cached');
  report[kind] = {
    total: results.length,
    ok: results.filter((r) => r.status === 'ok').length,
    cached: results.filter((r) => r.status === 'cached').length,
    failed,
  };
  console.log(
    `${kind}: ${report[kind].ok} fetched, ${report[kind].cached} cached, ${failed.length} failed`,
  );
  for (const f of failed.slice(0, 10)) console.log(`  MISSING ${kind}/${f.name}: ${f.status}`);
}

const failedTotal = Object.values(report).reduce((n, r) => n + r.failed.length, 0);
if (failedTotal > 0) {
  console.error(`WARNING: ${failedTotal} icons missing; UI will fall back to letter tiles.`);
}

// Asset inventory for ASSETS.md / sources page.
const inventory = {
  source: 'Wowhead icon CDN (wow.zamimg.com), Blizzard Entertainment game assets',
  fetchedAt: new Date().toISOString().slice(0, 10),
  counts: Object.fromEntries(
    Object.entries(report).map(([k, v]) => [k, v.ok + v.cached]),
  ),
  digest: createHash('sha256')
    .update(JSON.stringify(report))
    .digest('hex')
    .slice(0, 12),
};
await writeFile(path.join(OUT, 'inventory.json'), JSON.stringify(inventory, null, 2));
console.log('inventory written to public/icons/inventory.json');

import { expect, test } from '@playwright/test';

/** PRD §15.3 SEO acceptance + JS-disabled readability (§15.2 flow 9). */

const PAGES = [
  { path: '/', title: 'WoW Forever Talent Calculator — Free Online, No Sign-Up', noindex: false },
  { path: '/mage/', title: /WoW Forever Mage Talent Calculator/, noindex: false },
  { path: '/warrior/', title: /WoW Forever Warrior Talent Calculator/, noindex: false },
  { path: '/shaman/', title: /WoW Forever Shaman Talent Calculator/, noindex: false },
  { path: '/talents/', title: /Talent Reference/, noindex: false },
  { path: '/talents/mage/', title: /WoW Forever Mage Talents/, noindex: false },
  { path: '/changes/', title: /Talent Changes/, noindex: false },
  { path: '/sources/', title: /Data & Sources|Sources/, noindex: false },
  { path: '/about/', title: /About/, noindex: false },
  { path: '/privacy/', title: /Privacy/, noindex: false },
  { path: '/compare/', title: /Compare/, noindex: true },
  { path: '/my-builds/', title: /My Builds/, noindex: true },
];

function unescapeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&#38;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

for (const p of PAGES) {
  test(`${p.path}: title, canonical, meta, H1`, async ({ request, baseURL }) => {
    const res = await request.get(p.path);
    expect(res.status()).toBe(200);
    const html = await res.text();

    const title = unescapeEntities(/<title>([^<]+)<\/title>/.exec(html)?.[1] ?? '');
    expect(title).toBeTruthy();
    if (typeof p.title === 'string') expect(title).toBe(p.title);
    else expect(title).toMatch(p.title);

    // Self-referencing canonical with trailing slash.
    const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
    expect(canonical).toBe(`${baseURL?.replace(/:\d+/, '').replace('http://localhost', 'https://wowforevertalentcalculator.com')}${p.path}`.replace(/\/$/, '') + '/');

    const description = /<meta name="description" content="([^"]+)"/.exec(html)?.[1];
    expect(description?.length ?? 0).toBeGreaterThan(40);

    const h1Count = (html.match(/<h1[\s>]/g) ?? []).length;
    expect(h1Count).toBe(1);

    const robots = /<meta name="robots" content="([^"]+)"/.exec(html)?.[1];
    if (p.noindex) expect(robots).toContain('noindex');
    else expect(robots ?? '').not.toContain('noindex');
  });
}

test('all 9 class calculator pages exist with unique titles', async ({ request }) => {
  const classes = ['warrior', 'paladin', 'hunter', 'rogue', 'priest', 'shaman', 'mage', 'warlock', 'druid'];
  const titles = new Set<string>();
  for (const c of classes) {
    const res = await request.get(`/${c}/`);
    expect(res.status()).toBe(200);
    const html = await res.text();
    const title = /<title>([^<]+)<\/title>/.exec(html)?.[1];
    expect(titles.has(title!)).toBe(false);
    titles.add(title!);
    // Priest third tree must be "Shadow", never "Shadow Magic".
    if (c === 'priest') {
      expect(html).not.toContain('Shadow Magic');
      expect(html).toContain('Shadow');
    }
  }
});

test('home page has WebApplication JSON-LD without fabricated ratings', async ({ request }) => {
  const html = await (await request.get('/')).text();
  const ld = /<script type="application\/ld\+json">(.*?)<\/script>/s.exec(html)?.[1];
  expect(ld).toBeTruthy();
  const data = JSON.parse(ld!);
  expect(data['@type']).toBe('WebApplication');
  expect(data.aggregateRating).toBeUndefined();
});

test('sitemap excludes noindex pages; robots.txt references sitemap', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap-0.xml')).text();
  expect(sitemap).toContain('/mage/');
  expect(sitemap).not.toContain('/compare/');
  expect(sitemap).not.toContain('/my-builds/');

  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Sitemap: https://wowforevertalentcalculator.com/sitemap-index.xml');
});

test('unknown route returns real 404', async ({ request }) => {
  const res = await request.get('/unknown-class/');
  expect(res.status()).toBe(404);
});

test('JS disabled: reference and calculator pages stay readable', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto('/talents/mage/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('body')).toContainText('Wand Specialization');
  await expect(page.locator('body')).toContainText('not yet confirmed'); // unknown ranks shown honestly

  await page.goto('/mage/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Mage/);
  // Static class/change content readable without JS.
  await expect(page.locator('body')).toContainText(/Arcane/);
  await context.close();
});

test('footer carries the fan-made disclaimer; sources page carries CC BY attribution', async ({
  request,
}) => {
  const home = (await (await request.get('/')).text()).replace(/\s+/g, ' ');
  expect(home).toContain('Not affiliated with or endorsed by Blizzard Entertainment');

  const sources = (await (await request.get('/sources/')).text()).replace(/\s+/g, ' ');
  expect(sources).toContain('talentsforever.com');
  expect(sources).toContain('CC BY 4.0');
});

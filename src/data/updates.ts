export interface UpdateEntry {
  date: string;
  tag: string;
  title: string;
  items: string[];
}

// User-facing update notes, newest first. Every release adds one entry —
// keep items product-facing (what users get), one line each.
export const UPDATES: UpdateEntry[] = [
  {
    date: '2026-09-27',
    tag: 'Data',
    title: 'Beta client data — every rank verified',
    items: [
      'All talent data migrated to the beta client build (1.60.1.70009): every one of the 1,318 talent ranks now shows verified text — no more "estimate" placeholders.',
      'Legacy system expanded to 27 perks (was 20) across Adventure, Resourcefulness, and Professions.',
      'Trees moved with the beta: a few talents changed spots, ranks, or names (Feral\'s Mangle is now Primal Bite). The Classic comparison marks everything.',
    ],
  },
  {
    date: '2026-09-27',
    tag: 'Fix',
    title: 'Old share links keep working across data updates',
    items: [
      'Share links now open on the exact data snapshot they were created with — even after beta data updates. Older trees are kept and resolved automatically.',
    ],
  },
  {
    date: '2026-09-24',
    tag: 'Tooling',
    title: 'Share & save actions now measurable, privacy page updated',
    items: [
      'Sharing a link and saving a build are tracked as conversion events so we can see which tools people actually use. Privacy page explains what is (and is not) collected, plus opt-out.',
    ],
  },
  {
    date: '2026-09-22',
    tag: 'Content',
    title: 'Druid page: the headliner new talents, explained',
    items: [
      'The Druid calculator now walks through the biggest Forever additions — Eclipse, Primal Bite, Berserk, Wild Growth — with what they actually do, plus links into the full changes report.',
    ],
  },
  {
    date: '2026-09-16',
    tag: 'Launch',
    title: 'wowforevertalent.app is live',
    items: [
      'Free talent calculator for all 9 classes: 51-point budget, row gates, prerequisites, per-rank Classic comparison.',
      'Legacy system planner: all perks with a 16-point spread planner.',
      'Wiki: beta/launch dates, systems overview, class hub.',
      'Build comparison, local drafts, and share links — no sign-up.',
    ],
  },
];

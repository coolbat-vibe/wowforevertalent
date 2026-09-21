/**
 * Build-time snapshot loading for Astro pages. Frontmatter runs in Node,
 * so pages read the same immutable files the runtime fetches over HTTP.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type {
  ClassSnapshot,
  DatasetManifest,
  Ruleset,
} from '@domain/talents/types';

const root = process.cwd();

export interface SiteManifest extends DatasetManifest {
  ruleset: Ruleset;
  legacy?: {
    path: string;
    digest: string;
    perkCount: number;
  };
}

export function loadManifest(): SiteManifest {
  return JSON.parse(
    readFileSync(path.join(root, 'public/data/manifest.json'), 'utf8'),
  );
}

export function loadClassSnapshot(classId: string): ClassSnapshot {
  const manifest = loadManifest();
  const file = manifest.classes.find((c) => c.classId === classId);
  if (!file) throw new Error(`class not in manifest: ${classId}`);
  return JSON.parse(readFileSync(path.join(root, 'public', file.path), 'utf8'));
}

export function loadAllSnapshots(): ClassSnapshot[] {
  return loadManifest().classes.map((c) => loadClassSnapshot(c.classId));
}

export interface LegacyPerk {
  perkId: string;
  name: string;
  maxRank: number;
  text: string;
  iconRef: string;
  evidenceStatus: string;
  sourceIds: string[];
}

export interface LegacyData {
  schemaVersion: number;
  snapshotId: string;
  note: string | null;
  spendCapPerCharacter: number;
  earnableCapAtStart: number;
  trees: {
    treeId: string;
    name: string;
    iconRef: string;
    perks: LegacyPerk[];
  }[];
}

export function loadLegacy(): LegacyData {
  const manifest = loadManifest();
  if (!manifest.legacy) throw new Error('manifest has no legacy entry');
  return JSON.parse(
    readFileSync(path.join(root, 'public', manifest.legacy.path), 'utf8'),
  );
}

export const CLASS_ORDER = [
  'warrior',
  'paladin',
  'hunter',
  'rogue',
  'priest',
  'shaman',
  'mage',
  'warlock',
  'druid',
] as const;

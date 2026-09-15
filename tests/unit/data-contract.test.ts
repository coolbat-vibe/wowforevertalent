import { describe, expect, it } from 'vitest';
import { decodeBuild, encodeBuild } from '../../src/domain/sharing/codec';
import { applyAction, emptyBuild, validateBuild } from '../../src/domain/talents/rules';
import type { BuildAction } from '../../src/domain/talents/types';
import { loadManifest, loadRuleset, loadSnapshot, rng } from '../helpers/snapshot';

const manifest = loadManifest();

describe('data contract', () => {
  it('manifest lists all nine classes with hashed paths', () => {
    expect(manifest.classes).toHaveLength(9);
    for (const c of manifest.classes) {
      expect(c.path).toMatch(new RegExp(`^/data/classes/${c.classId}\\.[0-9a-f]{12}\\.json$`));
      expect(c.digest).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(manifest.snapshotId).toMatch(/^snap-[0-9a-f]{12}$/);
    expect(manifest.stage).toBe('preview');
  });

  for (const classId of [
    'warrior', 'paladin', 'hunter', 'rogue', 'priest',
    'shaman', 'mage', 'warlock', 'druid',
  ]) {
    it(`${classId}: snapshot satisfies structural invariants`, () => {
      const snap = loadSnapshot(classId);
      expect(snap.snapshotId).toBe(manifest.snapshotId);
      expect(snap.rulesetId).toBe(manifest.rulesetId);
      expect(snap.trees).toHaveLength(3);

      const ids = new Set(snap.talents.map((t) => t.talentId));
      expect(ids.size).toBe(snap.talents.length);

      const coords = new Set<string>();
      for (const t of snap.talents) {
        const key = `${t.treeId}:${t.row}:${t.column}`;
        expect(coords.has(key)).toBe(false);
        coords.add(key);
        expect(t.requiredEarlierPoints).toBe(t.row * 5);
        expect(t.rankEffects).toHaveLength(t.maxRank);
        expect(t.talentId.startsWith(`${classId}:`)).toBe(true);
        for (const pre of t.prerequisites) {
          const target = snap.talents.find((x) => x.talentId === pre.talentId);
          expect(target, `${t.talentId} prereq ${pre.talentId}`).toBeDefined();
          expect(target!.treeId).toBe(t.treeId);
          expect(pre.requiredRank).toBeGreaterThanOrEqual(1);
          expect(pre.requiredRank).toBeLessThanOrEqual(target!.maxRank);
        }
        // Unknown ranks stay unknown — never interpolated.
        for (const r of t.rankEffects) {
          if (r.evidenceStatus === 'unknown') expect(r.text).toBeNull();
          else expect(typeof r.text).toBe('string');
        }
      }
      // Tree talent lists reference real talents.
      for (const tree of snap.trees) {
        for (const id of tree.talentIds) expect(ids.has(id)).toBe(true);
      }
    });
  }
});

describe('property: random action sequences keep builds valid', () => {
  const ruleset = loadRuleset();

  for (const classId of ['mage', 'warrior', 'druid']) {
    it(`${classId}: 400 random actions → every committed state validates`, () => {
      const snap = loadSnapshot(classId);
      const random = rng(0xfeed + classId.length);
      let build = emptyBuild(classId, snap.snapshotId, ruleset, 60);
      const ids = snap.talents.map((t) => t.talentId);

      for (let i = 0; i < 400; i++) {
        const roll = random();
        let action: BuildAction;
        if (roll < 0.45) {
          action = { type: 'add', talentId: ids[Math.floor(random() * ids.length)] };
        } else if (roll < 0.8) {
          action = { type: 'remove', talentId: ids[Math.floor(random() * ids.length)] };
        } else if (roll < 0.9) {
          action = {
            type: 'resetTree',
            treeId: snap.trees[Math.floor(random() * 3)].treeId,
          };
        } else if (roll < 0.95) {
          action = { type: 'setLevel', level: 1 + Math.floor(random() * 60) };
        } else {
          action = { type: 'resetAll' };
        }
        const result = applyAction(build, action, snap, ruleset);
        if (result.ok) {
          const check = validateBuild(result.build, snap, ruleset);
          expect(check.valid, `action ${i} ${JSON.stringify(action)}: ${check.errors.map((e) => e.message).join('; ')}`).toBe(true);
          build = result.build;
        } else {
          // Failed actions must return the original state untouched.
          expect(result.build).toBe(build);
        }
      }
    });

    it(`${classId}: encode/decode round trip preserves any valid state`, () => {
      const snap = loadSnapshot(classId);
      const random = rng(0xbeef + classId.length);
      let build = emptyBuild(classId, snap.snapshotId, ruleset, 60);
      const ids = snap.talents.map((t) => t.talentId);
      for (let i = 0; i < 120; i++) {
        const result = applyAction(
          build,
          { type: 'add', talentId: ids[Math.floor(random() * ids.length)] },
          snap,
          ruleset,
        );
        if (result.ok) build = result.build;
      }
      const decoded = decodeBuild(encodeBuild(build), [snap.snapshotId], ruleset);
      expect(decoded.ok).toBe(true);
      if (decoded.ok) expect(decoded.build).toEqual(build);
    });
  }
});

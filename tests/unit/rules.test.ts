import { describe, expect, it } from 'vitest';
import {
  applyAction,
  compareBuilds,
  emptyBuild,
  getNodeAvailability,
  getPointBudget,
  minLevelForSpent,
  spentPoints,
  validateBuild,
} from '../../src/domain/talents/rules';
import type { Allocation, Build, ClassSnapshot } from '../../src/domain/talents/types';
import { loadRuleset, loadSnapshot } from '../helpers/snapshot';

const ruleset = loadRuleset();
const mage = loadSnapshot('mage');
const warrior = loadSnapshot('warrior');

function buildWith(
  snapshot: ClassSnapshot,
  allocation: Allocation,
  level = 60,
): Build {
  return { ...emptyBuild(snapshot.classDef.classId, snapshot.snapshotId, ruleset, level), allocation };
}

function talentAt(snapshot: ClassSnapshot, treeIndex: number, row: number) {
  const tree = snapshot.trees[treeIndex];
  const t = snapshot.talents.find((x) => x.treeId === tree.treeId && x.row === row);
  if (!t) throw new Error(`no talent at tree ${tree.treeId} row ${row}`);
  return t;
}

/** Spend n points legally in rows above `row` of the given tree. */
function spendInEarlierRows(
  snapshot: ClassSnapshot,
  treeIndex: number,
  row: number,
  n: number,
): Allocation {
  const tree = snapshot.trees[treeIndex];
  const allocation: Allocation = {};
  let remaining = n;
  const candidates = snapshot.talents
    .filter((t) => t.treeId === tree.treeId && t.row < row && t.prerequisites.length === 0)
    .sort((a, b) => a.row - b.row || a.column - b.column);
  // Fill row by row so intermediate row requirements stay satisfied.
  for (let r = 0; r < row && remaining > 0; r++) {
    for (const t of candidates.filter((x) => x.row === r)) {
      const take = Math.min(t.maxRank, remaining);
      if (take > 0) {
        allocation[t.talentId] = (allocation[t.talentId] ?? 0) + take;
        remaining -= take;
      }
      if (remaining === 0) break;
    }
  }
  if (remaining > 0) throw new Error(`could not spend ${n} points above row ${row}`);
  return allocation;
}

describe('point budget (standard profile)', () => {
  it('levels 1/9/10/30/60 give budgets 0/0/1/21/51', () => {
    expect(getPointBudget(1, 'standard', ruleset)).toBe(0);
    expect(getPointBudget(9, 'standard', ruleset)).toBe(0);
    expect(getPointBudget(10, 'standard', ruleset)).toBe(1);
    expect(getPointBudget(30, 'standard', ruleset)).toBe(21);
    expect(getPointBudget(60, 'standard', ruleset)).toBe(51);
  });

  it('rejects levels outside 1–60', () => {
    expect(getPointBudget(0, 'standard', ruleset)).toEqual({ unsupported: true });
    expect(getPointBudget(61, 'standard', ruleset)).toEqual({ unsupported: true });
  });

  it('minLevelForSpent matches the budget formula', () => {
    expect(minLevelForSpent(0, ruleset)).toBe(0);
    expect(minLevelForSpent(1, ruleset)).toBe(10);
    expect(minLevelForSpent(51, ruleset)).toBe(60);
  });
});

describe('allocation rules', () => {
  it('rejects adding beyond the 51-point budget without mutating state', () => {
    // 51 points: fill across trees legally.
    const allocation: Allocation = {};
    let remaining = 51;
    for (const tree of mage.trees) {
      for (let r = 0; r < 7 && remaining > 0; r++) {
        for (const t of mage.talents.filter(
          (x) => x.treeId === tree.treeId && x.row === r && x.prerequisites.length === 0,
        )) {
          const take = Math.min(t.maxRank, remaining);
          allocation[t.talentId] = (allocation[t.talentId] ?? 0) + take;
          remaining -= take;
          if (remaining === 0) break;
        }
      }
    }
    expect(spentPoints(allocation)).toBe(51);
    const build = buildWith(mage, allocation);
    expect(validateBuild(build, mage, ruleset).valid).toBe(true);

    const target = mage.talents.find(
      (t) => (allocation[t.talentId] ?? 0) < t.maxRank && t.row === 0,
    )!;
    const before = JSON.stringify(build);
    const result = applyAction(build, { type: 'add', talentId: target.talentId }, mage, ruleset);
    expect(result.ok).toBe(false);
    expect(result.errors[0].code).toBe('POINT_BUDGET_EXCEEDED');
    expect(JSON.stringify(result.build)).toBe(before);
  });

  it('rejects adding beyond maxRank', () => {
    const t = talentAt(mage, 0, 0);
    const build = buildWith(mage, { [t.talentId]: t.maxRank });
    const result = applyAction(build, { type: 'add', talentId: t.talentId }, mage, ruleset);
    expect(result.ok).toBe(false);
    expect(result.errors[0].code).toBe('RANK_LIMIT');
  });

  it('row requirement: 4 earlier points cannot unlock the second row, 5 can', () => {
    const row1 = talentAt(mage, 0, 1);
    const four = spendInEarlierRows(mage, 0, 1, 4);
    const five = spendInEarlierRows(mage, 0, 1, 5);

    const denied = applyAction(
      buildWith(mage, four),
      { type: 'add', talentId: row1.talentId },
      mage,
      ruleset,
    );
    expect(denied.ok).toBe(false);
    expect(denied.errors[0].code).toBe('ROW_REQUIREMENT');

    const allowed = applyAction(
      buildWith(mage, five),
      { type: 'add', talentId: row1.talentId },
      mage,
      ruleset,
    );
    expect(allowed.ok).toBe(true);
  });

  it('points in another tree do not count toward row requirements', () => {
    const otherTreeSpent = spendInEarlierRows(mage, 1, 2, 8); // 8 points in tree 1
    const row1 = talentAt(mage, 0, 1);
    const result = applyAction(
      buildWith(mage, otherTreeSpent),
      { type: 'add', talentId: row1.talentId },
      mage,
      ruleset,
    );
    expect(result.ok).toBe(false);
    expect(result.errors[0].code).toBe('ROW_REQUIREMENT');
  });

  it('points in the current row do not self-unlock that row', () => {
    const tree = mage.trees[0];
    const row1Talents = mage.talents.filter(
      (t) => t.treeId === tree.treeId && t.row === 1 && t.prerequisites.length === 0,
    );
    const five = spendInEarlierRows(mage, 0, 1, 5);
    // Spend 3 points on a row-1 node, then check availability of another
    // row-1 node: earlier-row points are still 5, current-row 3 must not
    // raise the requirement check beyond what row 2 needs.
    const first = row1Talents[0];
    const withCurrent = { ...five, [first.talentId]: 3 };
    const row2 = talentAt(mage, 0, 2);
    const availability = getNodeAvailability(
      row2.talentId,
      buildWith(mage, withCurrent),
      mage,
      ruleset,
    );
    // Row 2 requires 10 earlier points; 5 (row 0) + 3 (row 1) = 8 < 10.
    expect(availability.canAdd).toBe(false);
    expect(availability.addReason).toBe('row_requirement');
  });

  it('prerequisite one rank short blocks the dependent talent', () => {
    const pom = mage.talents.find((t) => t.talentId === 'mage:presence-of-mind')!;
    const ap = mage.talents.find((t) => t.talentId === 'mage:arcane-power')!;
    expect(ap.prerequisites[0].talentId).toBe(pom.talentId);
    // Spend enough earlier points for Arcane Power's row but skip PoM.
    const earlier = spendInEarlierRows(mage, 0, ap.row, ap.requiredEarlierPoints);
    const result = applyAction(
      buildWith(mage, earlier),
      { type: 'add', talentId: ap.talentId },
      mage,
      ruleset,
    );
    expect(result.ok).toBe(false);
    expect(result.errors[0].code).toBe('PREREQUISITE');
  });

  it('16-point keystone: learnable with the 16th point after 15 earlier points', () => {
    const tree = mage.trees[0];
    const keystone = mage.talents.find(
      (t) => t.treeId === tree.treeId && t.requiredEarlierPoints === 15 && t.prerequisites.length === 0,
    );
    if (!keystone) return; // tree has no direct 15-point gate node; skip
    const fourteen = spendInEarlierRows(mage, 0, keystone.row, 14);
    const denied = applyAction(
      buildWith(mage, fourteen),
      { type: 'add', talentId: keystone.talentId },
      mage,
      ruleset,
    );
    expect(denied.ok).toBe(false);

    const fifteen = spendInEarlierRows(mage, 0, keystone.row, 15);
    const allowed = applyAction(
      buildWith(mage, fifteen),
      { type: 'add', talentId: keystone.talentId },
      mage,
      ruleset,
    );
    expect(allowed.ok).toBe(true);
    expect(spentPoints(allowed.build.allocation)).toBe(16);
  });
});

describe('removal and reset', () => {
  it('refuses removal that breaks dependents and reports them', () => {
    const pom = mage.talents.find((t) => t.talentId === 'mage:presence-of-mind')!;
    const ap = mage.talents.find((t) => t.talentId === 'mage:arcane-power')!;
    const allocation = {
      ...spendInEarlierRows(mage, 0, ap.row, ap.requiredEarlierPoints),
      [pom.talentId]: 1,
      [ap.talentId]: 1,
    };
    const build = buildWith(mage, allocation);
    expect(validateBuild(build, mage, ruleset).valid).toBe(true);

    const result = applyAction(build, { type: 'remove', talentId: pom.talentId }, mage, ruleset);
    expect(result.ok).toBe(false);
    expect(result.errors[0].code).toBe('PREREQUISITE');
    expect(result.errors[0].details?.blockingDependents).toContain(ap.talentId);
    expect(result.build.allocation[pom.talentId]).toBe(1);
  });

  it('refuses removal that breaks row requirements of higher rows', () => {
    const five = spendInEarlierRows(mage, 0, 1, 5);
    const row1 = talentAt(mage, 0, 1);
    const allocation = { ...five, [row1.talentId]: 1 };
    const build = buildWith(mage, allocation);
    // Remove one of the row-0 points: row-1 node would drop below 5.
    const row0Id = Object.keys(five)[0];
    const result = applyAction(build, { type: 'remove', talentId: row0Id }, mage, ruleset);
    expect(result.ok).toBe(false);
    expect(result.errors[0].details?.blockingDependents).toContain(row1.talentId);
  });

  it('tree reset preserves other trees; resetAll clears everything', () => {
    const a = spendInEarlierRows(mage, 0, 1, 5);
    const b = spendInEarlierRows(mage, 1, 1, 5);
    const build = buildWith(mage, { ...a, ...b });

    const reset = applyAction(
      build,
      { type: 'resetTree', treeId: mage.trees[0].treeId },
      mage,
      ruleset,
    );
    expect(reset.ok).toBe(true);
    expect(spentPoints(reset.build.allocation)).toBe(5);
    for (const id of Object.keys(b)) expect(reset.build.allocation[id]).toBe(b[id]);

    const cleared = applyAction(reset.build, { type: 'resetAll' }, mage, ruleset);
    expect(cleared.ok).toBe(true);
    expect(spentPoints(cleared.build.allocation)).toBe(0);
  });

  it('rejects lowering level below what the spent points require', () => {
    const spent = spendInEarlierRows(mage, 0, 3, 15); // 15 points
    const build = buildWith(mage, spent, 60);
    const result = applyAction(build, { type: 'setLevel', level: 20 }, mage, ruleset);
    expect(result.ok).toBe(false);
    expect(result.errors[0].code).toBe('POINT_BUDGET_EXCEEDED');
    expect(result.errors[0].details?.requiredLevel).toBe(24);
    expect(result.build.level).toBe(60);
  });
});

describe('compare', () => {
  it('distinguishes moved points from added/removed points', () => {
    const t0a = mage.talents.find((t) => t.treeId === mage.trees[0].treeId && t.row === 0)!;
    const t0b = mage.talents.find(
      (t) => t.treeId === mage.trees[0].treeId && t.row === 0 && t.talentId !== t0a.talentId,
    )!;
    const a = buildWith(mage, { [t0a.talentId]: 3 });
    const b = buildWith(mage, { [t0b.talentId]: 3 });
    const result = compareBuilds(a, b, mage);
    if ('error' in result) throw new Error(result.error.message);
    expect(result.nodesChanged).toBe(2);
    expect(result.pointsMoved).toBe(3);
    expect(result.pointsOnlyInA).toBe(0);
    expect(result.pointsOnlyInB).toBe(0);
  });

  it('reports net differences separately', () => {
    const t0a = mage.talents.find((t) => t.treeId === mage.trees[0].treeId && t.row === 0)!;
    const t0b = mage.talents.find(
      (t) => t.treeId === mage.trees[0].treeId && t.row === 0 && t.talentId !== t0a.talentId,
    )!;
    const a = buildWith(mage, { [t0a.talentId]: 5 });
    const b = buildWith(mage, { [t0b.talentId]: 2 });
    const result = compareBuilds(a, b, mage);
    if ('error' in result) throw new Error(result.error.message);
    expect(result.pointsMoved).toBe(2);
    expect(result.pointsOnlyInA).toBe(3);
    expect(result.pointsOnlyInB).toBe(0);
  });

  it('refuses cross-snapshot comparison', () => {
    const a = buildWith(mage, {});
    const b = { ...buildWith(mage, {}), snapshotId: 'snap-other' };
    const result = compareBuilds(a, b, mage);
    expect('error' in result && result.error.code === 'UNSUPPORTED_VERSION').toBe(true);
  });
});

describe('warrior snapshot sanity', () => {
  it('has three trees and validatable talents', () => {
    expect(warrior.trees.map((t) => t.name)).toEqual(['Arms', 'Fury', 'Protection']);
    const build = buildWith(warrior, spendInEarlierRows(warrior, 0, 2, 10));
    expect(validateBuild(build, warrior, ruleset).valid).toBe(true);
  });
});

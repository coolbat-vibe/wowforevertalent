/**
 * Pure rules engine for talent allocation. No UI, no I/O.
 * Implements PRD §8 (allocation rules) and §12.2 (rule API).
 */
import type {
  Allocation,
  ActionResult,
  Build,
  BuildAction,
  BudgetProfile,
  ClassSnapshot,
  CompareResult,
  NodeAvailability,
  NodeDiff,
  RuleError,
  Ruleset,
  TalentNode,
  ValidationResult,
} from './types';

export function getPointBudget(
  level: number,
  profile: BudgetProfile,
  ruleset: Ruleset,
): number | { unsupported: true } {
  if (profile !== 'standard') return { unsupported: true };
  if (!Number.isInteger(level) || level < ruleset.minLevel || level > ruleset.maxLevel) {
    return { unsupported: true };
  }
  return Math.min(
    ruleset.maxBudget,
    Math.max(0, level - (ruleset.pointsStartLevel - 1)),
  );
}

/** Minimum level needed to have spent this many points (standard profile). */
export function minLevelForSpent(spent: number, ruleset: Ruleset): number {
  if (spent <= 0) return 0;
  return spent + (ruleset.pointsStartLevel - 1);
}

export function spentPoints(allocation: Allocation): number {
  let total = 0;
  for (const rank of Object.values(allocation)) total += rank;
  return total;
}

export function treePoints(
  allocation: Allocation,
  snapshot: ClassSnapshot,
  treeId: string,
): number {
  const tree = snapshot.trees.find((t) => t.treeId === treeId);
  if (!tree) return 0;
  let total = 0;
  for (const id of tree.talentIds) total += allocation[id] ?? 0;
  return total;
}

/** Points spent in rows strictly above `row` within one tree. */
export function earlierRowPoints(
  allocation: Allocation,
  snapshot: ClassSnapshot,
  treeId: string,
  row: number,
): number {
  let total = 0;
  for (const t of snapshot.talents) {
    if (t.treeId === treeId && t.row < row) total += allocation[t.talentId] ?? 0;
  }
  return total;
}

export function perTreeTotals(
  allocation: Allocation,
  snapshot: ClassSnapshot,
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const tree of snapshot.trees) {
    totals[tree.treeId] = treePoints(allocation, snapshot, tree.treeId);
  }
  return totals;
}

function nodeIndex(snapshot: ClassSnapshot): Map<string, TalentNode> {
  return new Map(snapshot.talents.map((t) => [t.talentId, t]));
}

function err(
  code: RuleError['code'],
  message: string,
  nodeId?: string,
  details?: Record<string, unknown>,
): RuleError {
  return { code, message, nodeId, details };
}

/**
 * Validate an entire build against a snapshot and ruleset.
 * Pure: never mutates the input build.
 */
export function validateBuild(
  build: Build,
  snapshot: ClassSnapshot,
  ruleset: Ruleset,
): ValidationResult {
  const errors: RuleError[] = [];
  const byId = nodeIndex(snapshot);

  if (build.classId !== snapshot.classDef.classId) {
    errors.push(
      err('UNKNOWN_CLASS', `build class ${build.classId} does not match snapshot ${snapshot.classDef.classId}`),
    );
    return { valid: false, errors, totals: { spent: 0, budget: 0, perTree: {} } };
  }

  const budget = getPointBudget(build.level, build.budgetProfile, ruleset);
  if (typeof budget !== 'number') {
    errors.push(
      err(
        'LEVEL_RANGE',
        `level ${build.level} outside ${ruleset.minLevel}–${ruleset.maxLevel} or unsupported budget profile`,
      ),
    );
    return { valid: false, errors, totals: { spent: 0, budget: 0, perTree: {} } };
  }

  let spent = 0;
  for (const [talentId, rank] of Object.entries(build.allocation)) {
    const node = byId.get(talentId);
    if (!node) {
      errors.push(err('UNKNOWN_NODE', `unknown talent ${talentId}`, talentId));
      continue;
    }
    if (!Number.isInteger(rank) || rank < 0) {
      errors.push(err('RANK_LIMIT', `rank ${rank} is not a non-negative integer`, talentId));
      continue;
    }
    if (rank > node.maxRank) {
      errors.push(
        err('RANK_LIMIT', `rank ${rank} exceeds maxRank ${node.maxRank}`, talentId),
      );
      continue;
    }
    spent += rank;
    if (rank === 0) continue;

    const earlier = earlierRowPoints(build.allocation, snapshot, node.treeId, node.row);
    if (earlier < node.requiredEarlierPoints) {
      errors.push(
        err(
          'ROW_REQUIREMENT',
          `${node.name} requires ${node.requiredEarlierPoints} points in earlier rows of its tree (has ${earlier})`,
          talentId,
          { required: node.requiredEarlierPoints, actual: earlier },
        ),
      );
    }
    for (const pre of node.prerequisites) {
      const have = build.allocation[pre.talentId] ?? 0;
      if (have < pre.requiredRank) {
        const target = byId.get(pre.talentId);
        errors.push(
          err(
            'PREREQUISITE',
            `${node.name} requires ${target?.name ?? pre.talentId} rank ${pre.requiredRank} (has ${have})`,
            talentId,
            { prerequisite: pre.talentId, requiredRank: pre.requiredRank, actualRank: have },
          ),
        );
      }
    }
  }

  if (spent > budget) {
    errors.push(
      err(
        'POINT_BUDGET_EXCEEDED',
        `spent ${spent} exceeds budget ${budget} at level ${build.level}`,
        undefined,
        { spent, budget, requiredLevel: minLevelForSpent(spent, ruleset) },
      ),
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    totals: { spent, budget, perTree: perTreeTotals(build.allocation, snapshot) },
  };
}

/**
 * Nodes that would become invalid if `talentId` lost one rank:
 * direct dependents (prerequisites) plus nodes whose row requirement
 * would stop being met because of reduced earlier-row points.
 */
export function blockingDependents(
  talentId: string,
  allocation: Allocation,
  snapshot: ClassSnapshot,
): string[] {
  const node = nodeIndex(snapshot).get(talentId);
  if (!node) return [];
  const rank = allocation[talentId] ?? 0;
  if (rank === 0) return [];

  const candidate: Allocation = { ...allocation, [talentId]: rank - 1 };
  if (candidate[talentId] === 0) delete candidate[talentId];

  const blocking: string[] = [];
  for (const other of snapshot.talents) {
    if (other.talentId === talentId) continue;
    const currentRank = allocation[other.talentId] ?? 0;
    if (currentRank === 0) continue;
    // Prerequisite break?
    for (const pre of other.prerequisites) {
      if (pre.talentId === talentId && rank - 1 < pre.requiredRank) {
        blocking.push(other.talentId);
      }
    }
    // Row requirement break (only relevant within the same tree).
    if (other.treeId === node.treeId && other.row > node.row) {
      const earlierAfter = earlierRowPoints(candidate, snapshot, other.treeId, other.row);
      if (earlierAfter < other.requiredEarlierPoints) {
        blocking.push(other.talentId);
      }
    }
  }
  return [...new Set(blocking)];
}

export function getNodeAvailability(
  talentId: string,
  build: Build,
  snapshot: ClassSnapshot,
  ruleset: Ruleset,
): NodeAvailability {
  const node = nodeIndex(snapshot).get(talentId);
  if (!node) {
    return {
      canAdd: false,
      canRemove: false,
      addReason: 'unknown_node',
      removeReason: 'unknown_node',
      blockingDependents: [],
    };
  }
  const rank = build.allocation[talentId] ?? 0;
  const spent = spentPoints(build.allocation);
  const budget = getPointBudget(build.level, build.budgetProfile, ruleset);

  let canAdd = true;
  let addReason: NodeAvailability['addReason'] = 'ok';
  if (typeof budget !== 'number' || spent + 1 > budget) {
    canAdd = false;
    addReason = 'budget_exceeded';
  } else if (rank >= node.maxRank) {
    canAdd = false;
    addReason = 'rank_maxed';
  } else if (
    earlierRowPoints(build.allocation, snapshot, node.treeId, node.row) <
    node.requiredEarlierPoints
  ) {
    canAdd = false;
    addReason = 'row_requirement';
  } else {
    for (const pre of node.prerequisites) {
      if ((build.allocation[pre.talentId] ?? 0) < pre.requiredRank) {
        canAdd = false;
        addReason = 'prerequisite';
        break;
      }
    }
  }

  const blocking = blockingDependents(talentId, build.allocation, snapshot);
  let canRemove = true;
  let removeReason: NodeAvailability['removeReason'] = 'ok';
  if (rank === 0) {
    canRemove = false;
    removeReason = 'rank_zero';
  } else if (blocking.length > 0) {
    canRemove = false;
    removeReason = 'dependents';
  }

  return { canAdd, canRemove, addReason, removeReason, blockingDependents: blocking };
}

function withRank(allocation: Allocation, talentId: string, rank: number): Allocation {
  const next = { ...allocation };
  if (rank <= 0) delete next[talentId];
  else next[talentId] = rank;
  return next;
}

/**
 * Transactional action application: build candidate → validate whole build →
 * commit or return the original state. See PRD §8.3.
 */
export function applyAction(
  build: Build,
  action: BuildAction,
  snapshot: ClassSnapshot,
  ruleset: Ruleset,
): ActionResult {
  const byId = nodeIndex(snapshot);
  let candidate: Build;

  switch (action.type) {
    case 'add': {
      const node = byId.get(action.talentId);
      if (!node) {
        return {
          ok: false,
          build,
          errors: [err('UNKNOWN_NODE', `unknown talent ${action.talentId}`, action.talentId)],
        };
      }
      const availability = getNodeAvailability(action.talentId, build, snapshot, ruleset);
      if (!availability.canAdd) {
        const codeMap = {
          budget_exceeded: 'POINT_BUDGET_EXCEEDED',
          rank_maxed: 'RANK_LIMIT',
          row_requirement: 'ROW_REQUIREMENT',
          prerequisite: 'PREREQUISITE',
        } as const;
        return {
          ok: false,
          build,
          errors: [
            err(
              codeMap[availability.addReason as keyof typeof codeMap] ?? 'INVALID_PAYLOAD',
              `cannot add point to ${node.name}: ${availability.addReason}`,
              action.talentId,
            ),
          ],
        };
      }
      candidate = {
        ...build,
        allocation: withRank(build.allocation, action.talentId, (build.allocation[action.talentId] ?? 0) + 1),
      };
      break;
    }
    case 'remove': {
      const node = byId.get(action.talentId);
      if (!node) {
        return {
          ok: false,
          build,
          errors: [err('UNKNOWN_NODE', `unknown talent ${action.talentId}`, action.talentId)],
        };
      }
      const rank = build.allocation[action.talentId] ?? 0;
      if (rank === 0) {
        return {
          ok: false,
          build,
          errors: [err('RANK_LIMIT', `${node.name} has no points to remove`, action.talentId)],
        };
      }
      const blocking = blockingDependents(action.talentId, build.allocation, snapshot);
      if (blocking.length > 0) {
        const names = blocking.map((id) => byId.get(id)?.name ?? id);
        return {
          ok: false,
          build,
          errors: [
            err(
              'PREREQUISITE',
              `cannot remove point from ${node.name}: required by ${names.join(', ')}`,
              action.talentId,
              { blockingDependents: blocking },
            ),
          ],
        };
      }
      candidate = { ...build, allocation: withRank(build.allocation, action.talentId, rank - 1) };
      break;
    }
    case 'resetTree': {
      const tree = snapshot.trees.find((t) => t.treeId === action.treeId);
      if (!tree) {
        return {
          ok: false,
          build,
          errors: [err('UNKNOWN_NODE', `unknown tree ${action.treeId}`)],
        };
      }
      const allocation = { ...build.allocation };
      for (const id of tree.talentIds) delete allocation[id];
      candidate = { ...build, allocation };
      break;
    }
    case 'resetAll': {
      candidate = { ...build, allocation: {} };
      break;
    }
    case 'setLevel': {
      if (
        !Number.isInteger(action.level) ||
        action.level < ruleset.minLevel ||
        action.level > ruleset.maxLevel
      ) {
        return {
          ok: false,
          build,
          errors: [
            err(
              'LEVEL_RANGE',
              `level must be ${ruleset.minLevel}–${ruleset.maxLevel}`,
              undefined,
              { requested: action.level },
            ),
          ],
        };
      }
      candidate = { ...build, level: action.level };
      break;
    }
    case 'load': {
      candidate = { ...build, level: action.level, allocation: { ...action.allocation } };
      break;
    }
  }

  const result = validateBuild(candidate, snapshot, ruleset);
  if (!result.valid) {
    return { ok: false, build, errors: result.errors };
  }
  return { ok: true, build: candidate, errors: [] };
}

/**
 * Compare two builds of the same class on the same snapshot. PRD §7.5.
 * Callers must not pass builds from different snapshots/classes; this
 * function refuses such comparisons explicitly.
 */
export function compareBuilds(
  a: Build,
  b: Build,
  snapshot: ClassSnapshot,
): CompareResult | { error: RuleError } {
  if (a.classId !== b.classId || a.classId !== snapshot.classDef.classId) {
    return {
      error: err('UNKNOWN_CLASS', 'A/B comparison requires both builds to be the same class as the snapshot'),
    };
  }
  if (a.snapshotId !== b.snapshotId || a.snapshotId !== snapshot.snapshotId) {
    return {
      error: err('UNSUPPORTED_VERSION', 'A/B comparison requires both builds on the same snapshot'),
    };
  }

  const diffs: NodeDiff[] = [];
  let pointsRemoved = 0;
  let pointsAdded = 0;
  const byId = nodeIndex(snapshot);
  const ids = new Set([...Object.keys(a.allocation), ...Object.keys(b.allocation)]);
  for (const id of ids) {
    const node = byId.get(id);
    if (!node) continue;
    const rankA = a.allocation[id] ?? 0;
    const rankB = b.allocation[id] ?? 0;
    if (rankA === rankB) continue;
    const d = rankA - rankB;
    if (d > 0) pointsRemoved += d;
    else pointsAdded += -d;
    diffs.push({
      talentId: id,
      treeId: node.treeId,
      name: node.name,
      rankA,
      rankB,
      delta: rankB - rankA,
    });
  }
  diffs.sort((x, y) => {
    const nx = byId.get(x.talentId)!;
    const ny = byId.get(y.talentId)!;
    const tx = snapshot.trees.findIndex((t) => t.treeId === nx.treeId);
    const ty = snapshot.trees.findIndex((t) => t.treeId === ny.treeId);
    return tx - ty || nx.row - ny.row || nx.column - ny.column;
  });

  const pointsMoved = Math.min(pointsRemoved, pointsAdded);
  return {
    classId: a.classId,
    snapshotId: a.snapshotId,
    levelA: a.level,
    levelB: b.level,
    treeTotalsA: perTreeTotals(a.allocation, snapshot),
    treeTotalsB: perTreeTotals(b.allocation, snapshot),
    diffs,
    nodesChanged: diffs.length,
    pointsMoved,
    pointsOnlyInA: pointsRemoved - pointsMoved,
    pointsOnlyInB: pointsAdded - pointsMoved,
  };
}

/** Create an empty build for a class on a given snapshot. */
export function emptyBuild(
  classId: string,
  snapshotId: string,
  ruleset: Ruleset,
  level = ruleset.defaultLevel,
): Build {
  return {
    classId,
    level,
    budgetProfile: 'standard',
    schemaVersion: 1,
    snapshotId,
    rulesetId: ruleset.rulesetId,
    allocation: {},
  };
}

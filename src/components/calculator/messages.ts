/**
 * User-facing English copy derived from structured domain data
 * (RuleError codes + details, EvidenceStatus). Never parses logic
 * back out of message strings.
 */
import type { EvidenceStatus, RuleError, Ruleset } from '@domain/talents/types';

export const EVIDENCE_LABELS: Record<EvidenceStatus, string> = {
  official: 'Official material',
  client_verified: 'Verified against the game client',
  footage_verified: 'Verified from recorded footage',
  community_recorded: 'Community preview record',
  source_estimate: 'Source estimate, not verified',
  unverified: 'Not yet verified',
  unknown: 'Effect unknown',
};

export const UNKNOWN_RANK_TEXT = 'Effect at this rank is not yet confirmed';

export function evidenceLabel(status: EvidenceStatus | undefined): string {
  return status ? EVIDENCE_LABELS[status] : EVIDENCE_LABELS.unknown;
}

export function ruleErrorMessage(error: RuleError, ruleset: Ruleset): string {
  const d = error.details ?? {};
  switch (error.code) {
    case 'POINT_BUDGET_EXCEEDED': {
      const requiredLevel = typeof d.requiredLevel === 'number' ? d.requiredLevel : undefined;
      const spent = typeof d.spent === 'number' ? d.spent : undefined;
      if (requiredLevel !== undefined && spent !== undefined) {
        return `Spending ${spent} points requires at least level ${requiredLevel}. Raise the level or remove points first.`;
      }
      return 'Not enough talent points at this level. Raise the level or remove points first.';
    }
    case 'RANK_LIMIT':
      return 'This talent is already at its maximum rank, or has no points to remove.';
    case 'ROW_REQUIREMENT': {
      const required = typeof d.required === 'number' ? d.required : undefined;
      const actual = typeof d.actual === 'number' ? d.actual : undefined;
      if (required !== undefined && actual !== undefined) {
        return `Requires ${required} points in earlier rows of the same tree (currently ${actual}).`;
      }
      return 'Requires more points in earlier rows of the same tree.';
    }
    case 'PREREQUISITE': {
      const blocking = Array.isArray(d.blockingDependents)
        ? (d.blockingDependents as unknown[])
        : undefined;
      if (blocking && blocking.length > 0) {
        return `Cannot remove this point: ${blocking.length} other talent${blocking.length > 1 ? 's' : ''} depend on it. Remove them first.`;
      }
      return 'A prerequisite talent rank is missing. Learn the required talent first.';
    }
    case 'LEVEL_RANGE':
      return `Level must be between ${ruleset.minLevel} and ${ruleset.maxLevel}.`;
    case 'UNKNOWN_NODE':
      return 'This link refers to a talent that does not exist in this data snapshot.';
    case 'UNKNOWN_CLASS':
      return 'This link refers to an unknown class.';
    case 'UNKNOWN_SNAPSHOT':
      return 'This link refers to a data snapshot this site does not have.';
    case 'UNSUPPORTED_VERSION':
      return 'This link was created for an unsupported data version.';
    case 'INVALID_PAYLOAD':
      return 'The share link is invalid or corrupted.';
    case 'STORAGE_UNAVAILABLE':
      return 'Local storage is not available on this device.';
    default:
      return 'That change could not be completed.';
  }
}

/** Two-letter neutral placeholder for a talent icon (no image assets). */
export function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

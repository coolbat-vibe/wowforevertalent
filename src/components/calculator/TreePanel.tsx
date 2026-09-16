/**
 * One talent tree in classic in-game style: framed slate panel with a
 * header (tree icon, name, spent points, per-tree reset), an SVG layer of
 * prerequisite arrows, and the 7x4 grid of focusable icon node buttons.
 *
 * Visual language follows the reference calculator at talentsforever.com:
 * learnable nodes get a green rim and green rank counter, maxed nodes a
 * gold rim and gold counter, hover lifts the icon with a soft white glow
 * (no persistent selection rim), and the point that maxes a talent fires
 * a scale-and-glow flash. Desktop hover shows a floating game tooltip;
 * mobile keeps the bottom detail panel.
 *
 * Arrow geometry depends on fixed grid metrics, so --node-size/--node-gap
 * in calculator.module.css must stay in sync with NODE_SIZE/GRID_GAP here.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Build,
  NodeAvailability,
  TalentNode,
  TalentTree,
} from '@domain/talents/types';
import { initials, UNKNOWN_RANK_TEXT } from './messages';
import { treeIconUrl } from './treeIcons';
import { IconImg } from './IconImg';
import { useMediaQuery } from './useMediaQuery';
import styles from './calculator.module.css';

// Keep in sync with --node-size / --node-gap in calculator.module.css.
const NODE_SIZE = 46;
const GRID_GAP = 14;
const FLASH_MS = 600;

export interface TreePanelProps {
  tree: TalentTree;
  nodes: TalentNode[];
  build: Build;
  availability: Map<string, NodeAvailability>;
  selectedId: string | null;
  readOnly: boolean;
  isMobile: boolean;
  activeOnMobile: boolean;
  points: number;
  onSelect: (id: string | null) => void;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onResetTree: (treeId: string) => void;
  nodeRefs: { current: Map<string, HTMLButtonElement> };
}

type NodeVisualState = 'available' | 'partial' | 'maxed' | 'locked' | 'nobudget';

function nodeVisualState(
  node: TalentNode,
  rank: number,
  avail: NodeAvailability,
): NodeVisualState {
  if (rank >= node.maxRank) return 'maxed';
  if (rank > 0) return 'partial';
  if (avail.canAdd) return 'available';
  if (avail.addReason === 'budget_exceeded') return 'nobudget';
  return 'locked';
}

const STATE_ARIA: Record<NodeVisualState, string> = {
  available: 'available to learn',
  partial: 'partially learned',
  maxed: 'at maximum rank',
  locked: 'locked by requirements',
  nobudget: 'locked, no points remaining at this level',
};

function hasUnknownEffect(node: TalentNode, rank: number): boolean {
  if (rank > 0) {
    const cur = node.rankEffects.find((r) => r.rank === rank);
    if (!cur || cur.text === null) return true;
  }
  if (rank < node.maxRank) {
    const next = node.rankEffects.find((r) => r.rank === rank + 1);
    if (!next || next.text === null) return true;
  }
  return false;
}

function cellCenter(column: number, row: number): { x: number; y: number } {
  return {
    x: column * (NODE_SIZE + GRID_GAP) + NODE_SIZE / 2,
    y: row * (NODE_SIZE + GRID_GAP) + NODE_SIZE / 2,
  };
}

/**
 * Classic right-angle connector: drop from the prerequisite's bottom edge,
 * then run horizontally into the dependent's side (straight down when both
 * share a column; straight across for same-row prerequisites).
 */
function linkPath(pre: TalentNode, dep: TalentNode): string {
  const p = cellCenter(pre.column, pre.row);
  const d = cellCenter(dep.column, dep.row);
  const stub = 1;
  if (dep.row > pre.row) {
    const startY = p.y + NODE_SIZE / 2;
    if (dep.column === pre.column) {
      return `M ${p.x} ${startY} L ${d.x} ${d.y - NODE_SIZE / 2 - stub}`;
    }
    const endX = dep.column > pre.column ? d.x - NODE_SIZE / 2 - stub : d.x + NODE_SIZE / 2 + stub;
    return `M ${p.x} ${startY} L ${p.x} ${d.y} L ${endX} ${d.y}`;
  }
  const startX = dep.column > pre.column ? p.x + NODE_SIZE / 2 : p.x - NODE_SIZE / 2;
  const endX = dep.column > pre.column ? d.x - NODE_SIZE / 2 - stub : d.x + NODE_SIZE / 2 + stub;
  return `M ${startX} ${p.y} L ${endX} ${p.y}`;
}

interface PrereqLink {
  key: string;
  d: string;
  met: boolean;
}

interface HoverTip {
  node: TalentNode;
  rank: number;
  state: NodeVisualState;
  top: number;
  left: number;
}

const TIP_WIDTH = 320;
const TIP_GAP = 10;

export const TreePanel = memo(function TreePanel(props: TreePanelProps) {
  const {
    tree,
    nodes,
    build,
    availability,
    selectedId,
    readOnly,
    isMobile,
    activeOnMobile,
    points,
    onSelect,
    onAdd,
    onRemove,
    onResetTree,
    nodeRefs,
  } = props;

  const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)');
  const [hoverTip, setHoverTip] = useState<HoverTip | null>(null);
  const [flashIds, setFlashIds] = useState<ReadonlySet<string>>(new Set());
  const prevRanksRef = useRef<Map<string, number>>(new Map());
  const flashTimerRef = useRef<number | null>(null);

  // Flash the node that just reached its maximum rank.
  useEffect(() => {
    const prev = prevRanksRef.current;
    const justMaxed: string[] = [];
    for (const node of nodes) {
      const rank = build.allocation[node.talentId] ?? 0;
      const before = prev.get(node.talentId) ?? 0;
      if (rank === node.maxRank && before < node.maxRank && rank > before) {
        justMaxed.push(node.talentId);
      }
      prev.set(node.talentId, rank);
    }
    // Drop ids that left this tree's node set.
    for (const id of [...prev.keys()]) {
      if (!nodes.some((n) => n.talentId === id)) prev.delete(id);
    }
    if (justMaxed.length > 0) {
      setFlashIds(new Set(justMaxed));
      if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
      flashTimerRef.current = window.setTimeout(() => setFlashIds(new Set()), FLASH_MS);
    }
  }, [build.allocation, nodes]);

  useEffect(
    () => () => {
      if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
    },
    [],
  );

  const showTip = useCallback(
    (node: TalentNode, rank: number, state: NodeVisualState) => {
      if (!finePointer) return;
      const el = nodeRefs.current.get(node.talentId);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const fitsRight = rect.right + TIP_GAP + TIP_WIDTH <= window.innerWidth - 8;
      const left = fitsRight
        ? rect.right + TIP_GAP
        : Math.max(8, rect.left - TIP_GAP - TIP_WIDTH);
      const top = Math.min(
        Math.max(8, rect.top - 8),
        Math.max(8, window.innerHeight - 220),
      );
      setHoverTip({ node, rank, state, top, left });
    },
    [finePointer, nodeRefs],
  );
  const hideTip = useCallback(() => setHoverTip(null), []);

  const moveFocus = useCallback(
    (node: TalentNode, dRow: number, dCol: number) => {
      const target = nodes.find(
        (n) => n.row === node.row + dRow && n.column === node.column + dCol,
      );
      if (target) nodeRefs.current.get(target.talentId)?.focus();
    },
    [nodes, nodeRefs],
  );

  const links = useMemo<PrereqLink[]>(() => {
    const byId = new Map(nodes.map((n) => [n.talentId, n]));
    const out: PrereqLink[] = [];
    for (const node of nodes) {
      for (const pre of node.prerequisites) {
        const preNode = byId.get(pre.talentId);
        if (!preNode) continue;
        out.push({
          key: `${pre.talentId}->${node.talentId}`,
          d: linkPath(preNode, node),
          met: (build.allocation[pre.talentId] ?? 0) >= pre.requiredRank,
        });
      }
    }
    return out;
  }, [nodes, build.allocation]);

  const cols = tree.grid.columns;
  const rows = tree.grid.rows;
  const gridW = cols * NODE_SIZE + (cols - 1) * GRID_GAP;
  const gridH = rows * NODE_SIZE + (rows - 1) * GRID_GAP;
  const markerId = tree.treeId.replace(/[^a-z0-9]/gi, '-');
  const iconUrl = treeIconUrl(tree.treeId);

  return (
    <section
      className={`${styles.treePanel} ${activeOnMobile ? styles.treePanelActive : ''}`}
      aria-label={`${tree.name} talent tree`}
    >
      <header className={styles.treeHeader}>
        {iconUrl ? (
          <IconImg src={iconUrl} className={styles.treeIcon} fallback={null} />
        ) : null}
        <h2 className={styles.treeName}>
          {tree.name}
          {tree.nameZh ? <span className={styles.treeNameZh}>{tree.nameZh}</span> : null}
        </h2>
        <span className={styles.treePoints} aria-label={`${points} points in ${tree.name}`}>
          {points}
        </span>
        <button
          type="button"
          className={styles.smallButton}
          data-testid="btn-reset-tree"
          data-tree-id={tree.treeId}
          onClick={() => onResetTree(tree.treeId)}
          aria-disabled={readOnly || points === 0 || undefined}
          aria-label={`Reset all points in ${tree.name}`}
        >
          Reset
        </button>
      </header>
      <div className={styles.treeGridWrap}>
        <svg
          className={styles.links}
          width={gridW}
          height={gridH}
          viewBox={`0 0 ${gridW} ${gridH}`}
          aria-hidden="true"
        >
          <defs>
            <marker
              id={`${markerId}-met`}
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="5"
              markerHeight="5"
              orient="auto"
            >
              <path d="M 0 0 L 8 4 L 0 8 z" className={styles.linkHeadMet} />
            </marker>
            <marker
              id={`${markerId}-unmet`}
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="5"
              markerHeight="5"
              orient="auto"
            >
              <path d="M 0 0 L 8 4 L 0 8 z" className={styles.linkHeadUnmet} />
            </marker>
          </defs>
          {links.map((link) => (
            <path
              key={link.key}
              d={link.d}
              className={link.met ? styles.linkMet : styles.linkUnmet}
              markerEnd={`url(#${markerId}-${link.met ? 'met' : 'unmet'})`}
            />
          ))}
        </svg>
        <div className={styles.treeGrid} role="group" aria-label={`${tree.name} talents`}>
          {nodes.map((node) => {
            const rank = build.allocation[node.talentId] ?? 0;
            const avail = availability.get(node.talentId);
            if (!avail) return null;
            const state = nodeVisualState(node, rank, avail);
            const unknown = hasUnknownEffect(node, rank);
            return (
              <button
                key={node.talentId}
                type="button"
                ref={(el) => {
                  if (el) nodeRefs.current.set(node.talentId, el);
                  else nodeRefs.current.delete(node.talentId);
                }}
                className={`${styles.node} ${styles[`r${node.row}`]} ${styles[`c${node.column}`]} ${styles[state]} ${flashIds.has(node.talentId) ? styles.flashing : ''}`}
                aria-disabled={readOnly || (rank === 0 && !avail.canAdd) || undefined}
                aria-label={`${node.name}, rank ${rank} of ${node.maxRank}, ${STATE_ARIA[state]}`}
                onClick={(e) => {
                  onSelect(node.talentId);
                  if (readOnly || isMobile) return;
                  if (e.detail === 0) return; // keyboard activation selects only
                  if (e.shiftKey) onRemove(node.talentId);
                  else onAdd(node.talentId);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onSelect(node.talentId);
                  if (!readOnly && !isMobile) onRemove(node.talentId);
                }}
                onFocus={() => onSelect(node.talentId)}
                onMouseEnter={() => showTip(node, rank, state)}
                onMouseLeave={hideTip}
                onKeyDown={(e) => {
                  if (e.key === '+' || e.key === '=') {
                    e.preventDefault();
                    onAdd(node.talentId);
                  } else if (e.key === '-' || e.key === '_') {
                    e.preventDefault();
                    onRemove(node.talentId);
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    moveFocus(node, -1, 0);
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    moveFocus(node, 1, 0);
                  } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    moveFocus(node, 0, -1);
                  } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    moveFocus(node, 0, 1);
                  } else if (e.key === 'Escape') {
                    hideTip();
                  }
                }}
              >
                <IconImg
                  src={`/icons/talents/${node.iconRef}.jpg`}
                  className={styles.nodeImg}
                  fallback={
                    <span className={styles.nodeIcon} aria-hidden="true">
                      {initials(node.name)}
                    </span>
                  }
                />
                <span className={styles.rankBadge} aria-hidden="true">
                  {rank}/{node.maxRank}
                </span>
                {unknown ? (
                  <span className={styles.unknownBadge} aria-hidden="true" title="Effect unknown">
                    ?
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
      {hoverTip ? (
        <div
          className={styles.tooltip}
          role="tooltip"
          style={{ top: hoverTip.top, left: hoverTip.left, width: TIP_WIDTH }}
          data-testid="node-tooltip"
        >
          <p className={styles.tipName}>{hoverTip.node.name}</p>
          <p className={styles.tipRank}>
            Rank {hoverTip.rank}/{hoverTip.node.maxRank}
            {hoverTip.node.passive ? ' · Passive' : ''}
            {hoverTip.node.cost ? ` · ${hoverTip.node.cost}` : ''}
          </p>
          {hoverTip.state === 'locked' ? (
            <p className={styles.tipUnmet}>
              {hoverTip.node.requiredEarlierPoints > 0
                ? `Requires ${hoverTip.node.requiredEarlierPoints} points in ${tree.name} talents`
                : null}
              {hoverTip.node.prerequisites.length > 0
                ? `${hoverTip.node.requiredEarlierPoints > 0 ? ' · ' : ''}Requires ${hoverTip.node.prerequisites
                    .map(
                      (p) =>
                        nodes.find((n) => n.talentId === p.talentId)?.name ?? p.talentId,
                    )
                    .join(', ')}`
                : null}
            </p>
          ) : null}
          {hoverTip.node.requirementText ? (
            <p className={styles.tipUnmet}>{hoverTip.node.requirementText}</p>
          ) : null}
          {hoverTip.rank > 0 ? (
            <p className={styles.tipEffect}>
              {hoverTip.node.rankEffects.find((r) => r.rank === hoverTip.rank)?.text ??
                UNKNOWN_RANK_TEXT}
            </p>
          ) : null}
          {hoverTip.rank < hoverTip.node.maxRank ? (
            <p className={styles.tipEffect}>
              <span className={styles.tipNext}>
                {hoverTip.rank > 0 ? 'Next rank: ' : ''}
              </span>
              {hoverTip.node.rankEffects.find((r) => r.rank === hoverTip.rank + 1)?.text ??
                UNKNOWN_RANK_TEXT}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
});

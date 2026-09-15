/**
 * One talent tree in classic in-game style: framed slate panel with a
 * header (tree icon, name, spent points, per-tree reset), an SVG layer of
 * prerequisite arrows, and the 7x4 grid of focusable icon node buttons.
 *
 * Arrow geometry depends on fixed grid metrics, so --node-size/--node-gap
 * in calculator.module.css must stay in sync with NODE_SIZE/GRID_GAP here.
 */
import { memo, useCallback, useMemo } from 'react';
import type {
  Build,
  NodeAvailability,
  TalentNode,
  TalentTree,
} from '@domain/talents/types';
import { initials } from './messages';
import { treeIconUrl } from './treeIcons';
import { IconImg } from './IconImg';
import styles from './calculator.module.css';

// Keep in sync with --node-size / --node-gap in calculator.module.css.
const NODE_SIZE = 44;
const GRID_GAP = 8;

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
          {tree.nameZh ? <span className={styles.treeNameZh}> {tree.nameZh}</span> : null}
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
            const selected = selectedId === node.talentId;
            return (
              <button
                key={node.talentId}
                type="button"
                ref={(el) => {
                  if (el) nodeRefs.current.set(node.talentId, el);
                  else nodeRefs.current.delete(node.talentId);
                }}
                className={`${styles.node} ${styles[`r${node.row}`]} ${styles[`c${node.column}`]} ${styles[state]} ${selected ? styles.nodeSelected : ''}`}
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
    </section>
  );
});

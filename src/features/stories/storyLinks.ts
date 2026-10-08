// src/features/stories/storyLinks.ts
//
// Vertical relationships between levels are DERIVED, not stored: two nodes on
// different stories are "linked" when their positions in the common
// engineering frame coincide within a tolerance. Dragging a boundary point
// away therefore breaks the link automatically (a setback / transfer).

import type { Shape } from '@/app/store/slices/drawingSlice';
import type { Story } from '@/app/store/slices/storySlice';
import type { PageCoordinateSystem } from '@/core/coordinate/pageCoordinateSystem';
import { frameOf, pageToFrame, type XY } from '@/core/coordinate/storyTransform';

export interface FrameNode {
  id: string;
  pageIndex: number;
  /** Position in the common engineering frame (mm). */
  mm: XY;
  /** Position in the node's own page coordinates. */
  page: XY;
}

export interface NodePair {
  a: FrameNode;
  b: FrameNode;
  distMm: number;
}

export interface VerticalLink {
  lower: FrameNode;
  upper: FrameNode;
  lowerStory: Story;
  upperStory: Story;
  distMm: number;
}

export type PageSystems = Record<number, PageCoordinateSystem>;

export function nodesOfStory(shapes: Shape[], story: Story, pages: PageSystems): FrameNode[] {
  const frame = frameOf(pages, story.pageIndex, story.adjust);
  const out: FrameNode[] = [];
  for (const s of shapes) {
    if (s.type !== 'node' || s.pageIndex !== story.pageIndex || !('geometry' in s)) continue;
    const g = s.geometry as { x: number; y: number };
    out.push({ id: s.id, pageIndex: s.pageIndex, mm: pageToFrame(g, frame), page: { x: g.x, y: g.y } });
  }
  return out;
}

/** One-to-one nearest matching of two node sets inside `radiusMm`. */
export function pairNodes(A: FrameNode[], B: FrameNode[], radiusMm: number): NodePair[] {
  const cand: NodePair[] = [];
  for (const a of A) {
    for (const b of B) {
      const d = Math.hypot(a.mm.x - b.mm.x, a.mm.y - b.mm.y);
      if (d <= radiusMm) cand.push({ a, b, distMm: d });
    }
  }
  cand.sort((p, q) => p.distMm - q.distMm);
  const usedA = new Set<string>();
  const usedB = new Set<string>();
  const out: NodePair[] = [];
  for (const c of cand) {
    if (usedA.has(c.a.id) || usedB.has(c.b.id)) continue;
    usedA.add(c.a.id);
    usedB.add(c.b.id);
    out.push(c);
  }
  return out;
}

export interface LevelSummary {
  lowerStory: Story;
  upperStory: Story;
  links: VerticalLink[];
  unlinkedLower: number;
  unlinkedUpper: number;
}

/** Links (and counts of unlinked nodes) between each pair of adjacent levels. */
export function summarizeLevels(
  shapes: Shape[],
  stories: Story[],
  pages: PageSystems,
  toleranceMm: number,
): LevelSummary[] {
  const sorted = [...stories].sort((a, b) => a.elevationMm - b.elevationMm);
  const nodes = new Map<string, FrameNode[]>();
  for (const s of sorted) nodes.set(s.id, nodesOfStory(shapes, s, pages));

  const out: LevelSummary[] = [];
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const lo = sorted[i];
    const hi = sorted[i + 1];
    const A = nodes.get(lo.id) ?? [];
    const B = nodes.get(hi.id) ?? [];
    const pairs = pairNodes(A, B, toleranceMm);
    out.push({
      lowerStory: lo,
      upperStory: hi,
      links: pairs.map((p) => ({
        lower: p.a, upper: p.b, lowerStory: lo, upperStory: hi, distMm: p.distMm,
      })),
      unlinkedLower: A.length - pairs.length,
      unlinkedUpper: B.length - pairs.length,
    });
  }
  return out;
}

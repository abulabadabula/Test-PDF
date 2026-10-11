import type { Shape } from '@/app/store/slices/drawingSlice';
import type { Story } from '@/app/store/slices/storySlice';
import type { PageCoordinateSystem } from '@/core/coordinate/pageCoordinateSystem';
import {
  frameForStory,
  pageToFrame,
  sourcePageForStory,
  type XY,
} from '@/core/coordinate/storyTransform';
import type { PlanSheet } from '@/features/plan-sheets/planSheetTypes';

export interface FrameNode {
  id: string;
  sheetId: string;
  pageIndex: number;
  mm: XY;
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
export type SheetSystems = Record<string, PageCoordinateSystem>;

export function shapeBelongsToStory(
  shape: Shape,
  story: Story,
  sourcePage: number,
): boolean {
  if (shape.pageIndex !== sourcePage) return false;
  if (shape.sheetId) return shape.sheetId === story.sheetId;

  return story.sheetId.startsWith('legacy-page-');
}

export function nodesOfStory(
  shapes: Shape[],
  story: Story,
  pageSystems: PageSystems,
  sheetSystems: SheetSystems,
  planSheets: PlanSheet[],
): FrameNode[] {
  const sourcePage = sourcePageForStory(story, planSheets);
  const frame = frameForStory(
    pageSystems,
    sheetSystems,
    story,
    planSheets,
  );

  const out: FrameNode[] = [];

  for (const shape of shapes) {
    if (
      shape.type !== 'node' ||
      !shapeBelongsToStory(shape, story, sourcePage) ||
      !('geometry' in shape)
    ) {
      continue;
    }

    const geometry = shape.geometry as { x: number; y: number };

    out.push({
      id: shape.id,
      sheetId: story.sheetId,
      pageIndex: sourcePage,
      mm: pageToFrame(geometry, frame),
      page: { x: geometry.x, y: geometry.y },
    });
  }

  return out;
}

export function pairNodes(
  aNodes: FrameNode[],
  bNodes: FrameNode[],
  radiusMm: number,
): NodePair[] {
  const candidates: NodePair[] = [];

  for (const a of aNodes) {
    for (const b of bNodes) {
      const distance = Math.hypot(
        a.mm.x - b.mm.x,
        a.mm.y - b.mm.y,
      );

      if (distance <= radiusMm) {
        candidates.push({
          a,
          b,
          distMm: distance,
        });
      }
    }
  }

  candidates.sort((a, b) => a.distMm - b.distMm);

  const usedA = new Set<string>();
  const usedB = new Set<string>();
  const pairs: NodePair[] = [];

  for (const candidate of candidates) {
    if (
      usedA.has(candidate.a.id) ||
      usedB.has(candidate.b.id)
    ) {
      continue;
    }

    usedA.add(candidate.a.id);
    usedB.add(candidate.b.id);
    pairs.push(candidate);
  }

  return pairs;
}

export interface LevelSummary {
  lowerStory: Story;
  upperStory: Story;
  links: VerticalLink[];
  unlinkedLower: number;
  unlinkedUpper: number;
}

export function summarizeLevels(
  shapes: Shape[],
  stories: Story[],
  pageSystems: PageSystems,
  sheetSystems: SheetSystems,
  planSheets: PlanSheet[],
  toleranceMm: number,
): LevelSummary[] {
  const ordered = [...stories].sort(
    (a, b) => a.elevationMm - b.elevationMm,
  );

  const nodes = new Map<string, FrameNode[]>();

  for (const story of ordered) {
    nodes.set(
      story.id,
      nodesOfStory(
        shapes,
        story,
        pageSystems,
        sheetSystems,
        planSheets,
      ),
    );
  }

  const summaries: LevelSummary[] = [];

  for (let index = 0; index < ordered.length - 1; index += 1) {
    const lowerStory = ordered[index];
    const upperStory = ordered[index + 1];

    const lowerNodes = nodes.get(lowerStory.id) ?? [];
    const upperNodes = nodes.get(upperStory.id) ?? [];

    const pairs = pairNodes(
      lowerNodes,
      upperNodes,
      toleranceMm,
    );

    summaries.push({
      lowerStory,
      upperStory,
      links: pairs.map((pair) => ({
        lower: pair.a,
        upper: pair.b,
        lowerStory,
        upperStory,
        distMm: pair.distMm,
      })),
      unlinkedLower: lowerNodes.length - pairs.length,
      unlinkedUpper: upperNodes.length - pairs.length,
    });
  }

  return summaries;
}

// src/core/coordinate/storyTransform.ts
//
// Maps plan-sheet points through their engineering coordinate systems into a
// shared frame. A Story now references a Plan Sheet; pageIndex remains only as
// legacy PDF source metadata.

import { pagePtToRealMm } from './engineeringScale';
import {
  DEFAULT_PAGE_COORDINATE_SYSTEM,
  engineeringMmToPagePoint,
  pagePointToEngineeringMm,
  type PageCoordinateSystem,
} from './pageCoordinateSystem';
import type { Story, StoryAdjust } from '@/app/store/slices/storySlice';
import type { PlanSheet } from '@/features/plan-sheets/planSheetTypes';

export interface XY {
  x: number;
  y: number;
}

export interface StoryFrame {
  cs: PageCoordinateSystem;
  adj: StoryAdjust;
}

export type Matrix6 = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
];

export const ZERO_ADJ: StoryAdjust = {
  dxMm: 0,
  dyMm: 0,
  rotationDeg: 0,
};

export function frameOf(
  pages: Record<number, PageCoordinateSystem>,
  pageIndex: number,
  adj: StoryAdjust | undefined,
): StoryFrame {
  return {
    cs: pages[pageIndex] ?? DEFAULT_PAGE_COORDINATE_SYSTEM,
    adj: adj ?? ZERO_ADJ,
  };
}

export function sourcePageForStory(
  story: Story,
  planSheets: PlanSheet[],
): number {
  return (
    planSheets.find((sheet) => sheet.id === story.sheetId)?.sourcePage ??
    story.pageIndex ??
    1
  );
}

export function planSheetForStory(
  story: Story,
  planSheets: PlanSheet[],
): PlanSheet | null {
  return planSheets.find((sheet) => sheet.id === story.sheetId) ?? null;
}

export function frameForStory(
  pageSystems: Record<number, PageCoordinateSystem>,
  sheetSystems: Record<string, PageCoordinateSystem>,
  story: Story,
  planSheets: PlanSheet[],
): StoryFrame {
  const sheet = planSheetForStory(story, planSheets);
  const sourcePage = sheet?.sourcePage ?? story.pageIndex ?? 1;
  const cs =
    sheet && sheetSystems[sheet.id]
      ? sheetSystems[sheet.id]
      : pageSystems[sourcePage] ?? DEFAULT_PAGE_COORDINATE_SYSTEM;

  return {
    cs,
    adj: story.adjust ?? ZERO_ADJ,
  };
}

function applyAdj(point: XY, adj: StoryAdjust): XY {
  const r = (adj.rotationDeg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);

  return {
    x: point.x * c - point.y * s + adj.dxMm,
    y: point.x * s + point.y * c + adj.dyMm,
  };
}

function invAdj(point: XY, adj: StoryAdjust): XY {
  const r = (adj.rotationDeg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  const x = point.x - adj.dxMm;
  const y = point.y - adj.dyMm;

  return {
    x: x * c + y * s,
    y: -x * s + y * c,
  };
}

export function pageToFrame(
  point: XY,
  frame: StoryFrame,
): XY {
  return applyAdj(
    pagePointToEngineeringMm(point, frame.cs),
    frame.adj,
  );
}

export function frameToPage(
  mm: XY,
  frame: StoryFrame,
): XY {
  return engineeringMmToPagePoint(
    invAdj(mm, frame.adj),
    frame.cs,
  );
}

export function storyPointToBasePage(
  point: XY,
  from: StoryFrame,
  base: StoryFrame,
): XY {
  return frameToPage(
    pageToFrame(point, from),
    base,
  );
}

export function basePageToStoryPoint(
  point: XY,
  from: StoryFrame,
  base: StoryFrame,
): XY {
  return frameToPage(
    pageToFrame(point, base),
    from,
  );
}

export function storyMatrix(
  from: StoryFrame,
  base: StoryFrame,
): Matrix6 {
  const origin = storyPointToBasePage(
    { x: 0, y: 0 },
    from,
    base,
  );

  const px = storyPointToBasePage(
    { x: 1, y: 0 },
    from,
    base,
  );

  const py = storyPointToBasePage(
    { x: 0, y: 1 },
    from,
    base,
  );

  return [
    px.x - origin.x,
    px.y - origin.y,
    py.x - origin.x,
    py.y - origin.y,
    origin.x,
    origin.y,
  ];
}

export function applyMatrix(
  matrix: Matrix6,
  point: XY,
): XY {
  return {
    x: matrix[0] * point.x + matrix[2] * point.y + matrix[4],
    y: matrix[1] * point.x + matrix[3] * point.y + matrix[5],
  };
}

export function matrixScale(matrix: Matrix6): number {
  return Math.hypot(matrix[0], matrix[1]);
}

export function matrixRotation(matrix: Matrix6): number {
  return Math.atan2(matrix[1], matrix[0]);
}


/**
 * Frame of a Plan Sheet that may not have a Story yet (e.g. a reference-only
 * sheet used as the base view). Falls back to the sheet / page coordinate
 * system with no adjustment.
 */
export function frameForSheet(
  pageSystems: Record<number, PageCoordinateSystem>,
  sheetSystems: Record<string, PageCoordinateSystem>,
  sheet: PlanSheet,
  adj?: StoryAdjust,
): StoryFrame {
  return {
    cs:
      sheetSystems[sheet.id] ??
      pageSystems[sheet.sourcePage] ??
      DEFAULT_PAGE_COORDINATE_SYSTEM,
    adj: adj ?? ZERO_ADJ,
  };
}

/**
 * Frame used as the common reference when viewing `baseSheet`. Uses the
 * base Story's adjustment when the sheet has a Story, otherwise none.
 */
export function baseFrameForSheet(
  pageSystems: Record<number, PageCoordinateSystem>,
  sheetSystems: Record<string, PageCoordinateSystem>,
  baseSheet: PlanSheet,
  stories: Story[],
): StoryFrame {
  const story = stories.find((item) => item.sheetId === baseSheet.id);
  return frameForSheet(pageSystems, sheetSystems, baseSheet, story?.adjust);
}

/**
 * Solve the translation (dxMm, dyMm) that places `anchor` (a point in the
 * underlay's own source-page coordinates) exactly on `target` (a point in the
 * base source-page coordinates). The underlay's rotation is preserved.
 */
export function adjustToPlace(
  anchor: XY,
  target: XY,
  from: StoryFrame,
  base: StoryFrame,
): StoryAdjust {
  const m = pagePointToEngineeringMm(anchor, from.cs);
  const goal = pageToFrame(target, base);

  const r = (from.adj.rotationDeg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);

  return {
    dxMm: goal.x - (m.x * c - m.y * s),
    dyMm: goal.y - (m.x * s + m.y * c),
    rotationDeg: from.adj.rotationDeg,
  };
}


/**
 * Fold the translation of a sheet's placement into its own origin.
 *
 * The shared origin is defined on the base sheet. A sheet that is translated
 * into alignment keeps the same engineering coordinates for every point, but
 * the position of the shared origin inside that sheet changes. Moving the
 * sheet's origin marker (and zeroing the translation) keeps the sheet's own
 * coordinates, grid and status-bar readout equal to the shared coordinates.
 * Rotation is kept as is.
 */
export function foldAdjustIntoOrigin(
  cs: PageCoordinateSystem,
  adj: StoryAdjust,
): { origin: XY; adjust: StoryAdjust } {
  const k = pagePtToRealMm(1, cs.scaleNumerator, cs.scaleDenominator) || 1;
  const r = (adj.rotationDeg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);

  // R^-1 * d, then negated: the shift of the origin in engineering mm.
  const shiftX = -(adj.dxMm * c + adj.dyMm * s);
  const shiftY = -(-adj.dxMm * s + adj.dyMm * c);

  return {
    origin: {
      x: cs.origin.x + shiftX / k,
      y: cs.origin.y - shiftY / k,
    },
    adjust: {
      dxMm: 0,
      dyMm: 0,
      rotationDeg: adj.rotationDeg,
    },
  };
}

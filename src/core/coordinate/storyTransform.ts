// src/core/coordinate/storyTransform.ts
//
// Maps points between PDF pages ("stories") through the shared engineering
// frame (mm). Every page already has its own origin + drawing scale
// (PageCoordinateSystem); a story may additionally carry a small adjustment
// (dx, dy, rotation) so imperfectly drawn levels can be lined up by eye.
//
//   page point --pagePointToEngineeringMm--> mm --adjust--> COMMON FRAME
//
// All of these maps are affine, so a whole page can be mapped onto the base
// page with ONE 2D matrix (see storyMatrix) - used both for drawing the PDF
// overlay bitmap and for cheaply transforming vertices.

import {
  DEFAULT_PAGE_COORDINATE_SYSTEM,
  engineeringMmToPagePoint,
  pagePointToEngineeringMm,
  type PageCoordinateSystem,
} from './pageCoordinateSystem';
import type { StoryAdjust } from '@/app/store/slices/storySlice';

export interface XY { x: number; y: number }

export interface StoryFrame {
  cs: PageCoordinateSystem;
  adj: StoryAdjust;
}

/** [a, b, c, d, e, f]  =>  x' = a*x + c*y + e,  y' = b*x + d*y + f */
export type Matrix6 = readonly [number, number, number, number, number, number];

export const ZERO_ADJ: StoryAdjust = { dxMm: 0, dyMm: 0, rotationDeg: 0 };

export function frameOf(
  pages: Record<number, PageCoordinateSystem>,
  pageIndex: number,
  adj: StoryAdjust | undefined,
): StoryFrame {
  return { cs: pages[pageIndex] ?? DEFAULT_PAGE_COORDINATE_SYSTEM, adj: adj ?? ZERO_ADJ };
}

function applyAdj(p: XY, adj: StoryAdjust): XY {
  const r = (adj.rotationDeg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return { x: p.x * c - p.y * s + adj.dxMm, y: p.x * s + p.y * c + adj.dyMm };
}

function invAdj(p: XY, adj: StoryAdjust): XY {
  const r = (adj.rotationDeg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  const x = p.x - adj.dxMm;
  const y = p.y - adj.dyMm;
  return { x: x * c + y * s, y: -x * s + y * c };
}

/** Page point of a story -> common engineering frame (mm). */
export function pageToFrame(p: XY, f: StoryFrame): XY {
  return applyAdj(pagePointToEngineeringMm(p, f.cs), f.adj);
}

/** Common engineering frame (mm) -> page point of a story. */
export function frameToPage(m: XY, f: StoryFrame): XY {
  return engineeringMmToPagePoint(invAdj(m, f.adj), f.cs);
}

export function storyPointToBasePage(p: XY, from: StoryFrame, base: StoryFrame): XY {
  return frameToPage(pageToFrame(p, from), base);
}

export function basePageToStoryPoint(p: XY, from: StoryFrame, base: StoryFrame): XY {
  return frameToPage(pageToFrame(p, base), from);
}

/** Affine matrix taking page points of `from` to page points of `base`. */
export function storyMatrix(from: StoryFrame, base: StoryFrame): Matrix6 {
  const o = storyPointToBasePage({ x: 0, y: 0 }, from, base);
  const px = storyPointToBasePage({ x: 1, y: 0 }, from, base);
  const py = storyPointToBasePage({ x: 0, y: 1 }, from, base);
  return [px.x - o.x, px.y - o.y, py.x - o.x, py.y - o.y, o.x, o.y];
}

export function applyMatrix(m: Matrix6, p: XY): XY {
  return { x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] };
}

/** Uniform scale factor of a (similarity) matrix. */
export function matrixScale(m: Matrix6): number {
  return Math.hypot(m[0], m[1]);
}

/** Rotation (radians) of a (similarity) matrix. */
export function matrixRotation(m: Matrix6): number {
  return Math.atan2(m[1], m[0]);
}

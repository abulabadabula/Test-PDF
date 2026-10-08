// src/features/stories/storySnap.ts
//
// Lets the active level snap to boundary points / endpoints / column centres of
// the other (visible) levels, so the vertical relationship is exact.

import type { RootState } from '@/app/store';
import type { SnapPoint } from '@/features/drawing/snapping/snamTypes';
import { applyMatrix, frameOf, storyMatrix } from '@/core/coordinate/storyTransform';
import { elementVertices, isStructural } from './storyGeometry';

export function findGhostSnap(
  cursor: { x: number; y: number },
  state: RootState,
  zoom: number,
  tolerancePx = 10,
): SnapPoint | null {
  const { stories, ghostSnap } = state.story;
  if (!ghostSnap || !state.ui.snapEnabled || state.ui.snapTypes.endpoint === false) return null;

  const currentPage = state.pdf.currentPage;
  const pages = state.pageCoordinate.pages;
  const baseStory = stories.find((s) => s.pageIndex === currentPage);
  const baseFrame = frameOf(pages, currentPage, baseStory?.adjust);
  const tol = tolerancePx / Math.max(zoom, 0.0001);

  let best: SnapPoint | null = null;
  for (const story of stories) {
    if (!story.overlayVisible || story.pageIndex === currentPage) continue;
    const m = storyMatrix(frameOf(pages, story.pageIndex, story.adjust), baseFrame);

    for (const shape of state.drawing.shapes) {
      if (shape.pageIndex !== story.pageIndex || !isStructural(shape)) continue;
      for (const v of elementVertices(shape)) {
        const p = applyMatrix(m, v);
        const d = Math.hypot(p.x - cursor.x, p.y - cursor.y);
        if (d <= tol && (!best || d < best.distance)) {
          best = { point: p, type: 'endpoint', elementId: `ghost:${story.id}:${shape.id}`, distance: d };
        }
      }
    }
  }
  return best;
}

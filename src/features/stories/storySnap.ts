import type { RootState } from '@/app/store';
import type { SnapPoint } from '@/features/drawing/snapping/snamTypes';
import {
  applyMatrix,
  frameForStory,
  sourcePageForStory,
  storyMatrix,
} from '@/core/coordinate/storyTransform';
import { elementVertices, isStructural } from './storyGeometry';

export function findGhostSnap(
  cursor: { x: number; y: number },
  state: RootState,
  zoom: number,
  tolerancePx = 10,
): SnapPoint | null {
  const {
    stories,
    ghostSnap,
  } = state.story;

  if (
    !ghostSnap ||
    !state.ui.snapEnabled ||
    state.ui.snapTypes.endpoint === false
  ) {
    return null;
  }

  const currentSheetId =
    state.planSheet.activeSheetId;

  const baseStory = stories.find(
    (story) => story.sheetId === currentSheetId,
  );

  if (!baseStory) return null;

  const baseFrame = frameForStory(
    state.pageCoordinate.pages,
    state.pageCoordinate.sheets,
    baseStory,
    state.planSheet.sheets,
  );

  const tolerance =
    tolerancePx / Math.max(zoom, 0.0001);

  let best: SnapPoint | null = null;

  for (const story of stories) {
    if (
      !story.overlayVisible ||
      story.sheetId === currentSheetId
    ) {
      continue;
    }

    const from = frameForStory(
      state.pageCoordinate.pages,
      state.pageCoordinate.sheets,
      story,
      state.planSheet.sheets,
    );

    const matrix = storyMatrix(
      from,
      baseFrame,
    );

    const sourcePage = sourcePageForStory(
      story,
      state.planSheet.sheets,
    );

    for (const shape of state.drawing.shapes) {
      if (shape.pageIndex !== sourcePage) continue;

      if (
        shape.sheetId
          ? shape.sheetId !== story.sheetId
          : !story.sheetId.startsWith('legacy-page-')
      ) {
        continue;
      }

      if (!isStructural(shape)) continue;

      for (const vertex of elementVertices(shape)) {
        const point = applyMatrix(matrix, vertex);
        const distance = Math.hypot(
          point.x - cursor.x,
          point.y - cursor.y,
        );

        if (
          distance <= tolerance &&
          (!best || distance < best.distance)
        ) {
          best = {
            point,
            type: 'endpoint',
            elementId: `ghost:${story.id}:${shape.id}`,
            distance,
          };
        }
      }
    }
  }

  return best;
}

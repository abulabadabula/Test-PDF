// src/features/stories/underlayActions.ts
//
// Store-level helpers for turning Plan Sheets into underlays of the active
// base Plan Sheet.

import { store } from '@/app/store';
import { ensureSheet } from '@/app/store/slices/pageCoordinateSlice';
import {
  addStory,
  setAlignStory,
  updateStoryAdjust,
} from '@/app/store/slices/storySlice';
import {
  adjustToPlace,
  baseFrameForSheet,
  frameForSheet,
  planSheetForStory,
  ZERO_ADJ,
} from '@/core/coordinate/storyTransform';
import type { PlanSheet } from '@/features/plan-sheets/planSheetTypes';

function cropCentre(sheet: PlanSheet) {
  return {
    x: sheet.crop.x + sheet.crop.width / 2,
    y: sheet.crop.y + sheet.crop.height / 2,
  };
}

/**
 * Adjustment that lands the centre of `sheet`'s crop on the centre of the
 * active base sheet's crop. This is the starting point for manual alignment:
 * several storeys are often cropped from the same drawing page, so without
 * it a new underlay would sit wherever its crop happens to be on that page.
 */
function centredAdjust(sheet: PlanSheet, adjSource = ZERO_ADJ) {
  const state = store.getState();
  const baseSheet = state.planSheet.sheets.find(
    (item) => item.id === state.planSheet.activeSheetId,
  );

  if (!baseSheet || baseSheet.id === sheet.id) return null;

  const pages = state.pageCoordinate.pages;
  const sheets = state.pageCoordinate.sheets;

  const base = baseFrameForSheet(pages, sheets, baseSheet, state.story.stories);
  const from = frameForSheet(pages, sheets, sheet, adjSource);

  return adjustToPlace(cropCentre(sheet), cropCentre(baseSheet), from, base);
}

/** Make a Plan Sheet an (initially centred) visible underlay, creating its Story if needed. */
export function addSheetAsUnderlay(sheet: PlanSheet) {
  const state = store.getState();
  const existing = state.story.stories.find((story) => story.sheetId === sheet.id);

  if (existing) return existing.id;

  store.dispatch(
    ensureSheet({ sheetId: sheet.id, pageIndex: sheet.sourcePage }),
  );

  store.dispatch(
    addStory({
      sheetId: sheet.id,
      pageIndex: sheet.sourcePage,
      name: sheet.name,
      overlayVisible: true,
      adjust: centredAdjust(sheet) ?? undefined,
    }),
  );

  return store
    .getState()
    .story.stories.find((story) => story.sheetId === sheet.id)?.id;
}

/** Re-centre a story's underlay on the active base sheet (keeps rotation 0). */
export function centreUnderlayOnBase(storyId: string) {
  const state = store.getState();
  const story = state.story.stories.find((item) => item.id === storyId);
  if (!story) return;

  const sheet = planSheetForStory(story, state.planSheet.sheets);
  if (!sheet) return;

  const adjust = centredAdjust(sheet);
  if (adjust) store.dispatch(updateStoryAdjust({ id: story.id, changes: adjust }));
}

/** Add (if needed) and start interactive alignment of a sheet's underlay. */
export function startAligningSheet(sheet: PlanSheet) {
  const id = addSheetAsUnderlay(sheet);
  if (id) store.dispatch(setAlignStory(id));
}


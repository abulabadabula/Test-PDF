// src/features/stories/underlayActions.ts
//
// Store-level helpers for turning Plan Sheets into underlays of the fixed
// base Plan Sheet.

import { store } from '@/app/store';
import { ensureSheet, moveSheetOrigin } from '@/app/store/slices/pageCoordinateSlice';
import {
  addStory,
  setAlignStory,
  updateStory,
  updateStoryAdjust,
} from '@/app/store/slices/storySlice';
import { updatePlanSheet } from '@/app/store/slices/planSheetSlice';
import {
  adjustToPlace,
  baseFrameForSheet,
  foldAdjustIntoOrigin,
  frameForSheet,
  frameForStory,
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
 * designated base sheet's crop. This is the starting point for manual alignment:
 * several storeys are often cropped from the same drawing page, so without
 * it a new underlay would sit wherever its crop happens to be on that page.
 */
function centredAdjust(sheet: PlanSheet, adjSource = ZERO_ADJ) {
  const state = store.getState();
  const baseSheet = state.planSheet.sheets.find(
    (item) => item.id === state.planSheet.baseSheetId,
  );

  if (!baseSheet || baseSheet.id === sheet.id) return null;

  const pages = state.pageCoordinate.pages;
  const sheets = state.pageCoordinate.sheets;

  const base = baseFrameForSheet(pages, sheets, baseSheet, state.story.stories);
  const from = frameForSheet(pages, sheets, sheet, adjSource);

  return adjustToPlace(cropCentre(sheet), cropCentre(baseSheet), from, base);
}

/**
 * Move a sheet's translation into its own origin marker.
 *
 * The shared origin is set on the base sheet only. Every other sheet keeps its
 * origin marker on that same physical point, so translating a sheet moves its
 * own marker instead of leaving a translation offset behind.
 */
export function foldStoryAdjust(storyId: string) {
  const state = store.getState();
  const story = state.story.stories.find((item) => item.id === storyId);
  if (!story) return;

  const frame = frameForStory(
    state.pageCoordinate.pages,
    state.pageCoordinate.sheets,
    story,
    state.planSheet.sheets,
  );

  const folded = foldAdjustIntoOrigin(frame.cs, frame.adj);

  store.dispatch(
    moveSheetOrigin({
      sheetId: story.sheetId,
      x: folded.origin.x,
      y: folded.origin.y,
    }),
  );
  store.dispatch(updateStoryAdjust({ id: story.id, changes: folded.adjust }));
}

/** Make a Plan Sheet an (initially centred) visible underlay, creating its Story if needed. */
export function addSheetAsUnderlay(sheet: PlanSheet) {
  const state = store.getState();
  const existing = state.story.stories.find((story) => story.sheetId === sheet.id);

  if (existing) {
    store.dispatch(updateStory({ id: existing.id, changes: { overlayVisible: true } }));
    return existing.id;
  }

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

  const created = store
    .getState()
    .story.stories.find((story) => story.sheetId === sheet.id)?.id;

  if (created) foldStoryAdjust(created);

  return created;
}

/** Re-centre a story's underlay on the designated base floor (keeps rotation 0). */
export function centreUnderlayOnBase(storyId: string) {
  const state = store.getState();
  const story = state.story.stories.find((item) => item.id === storyId);
  if (!story) return;

  const sheet = planSheetForStory(story, state.planSheet.sheets);
  if (!sheet) return;

  const adjust = centredAdjust(sheet);
  if (adjust) {
    store.dispatch(updateStoryAdjust({ id: story.id, changes: adjust }));
    foldStoryAdjust(story.id);
  }
}

/** Add (if needed) and start interactive alignment of a sheet's underlay. */
export function startAligningSheet(sheet: PlanSheet) {
  // Alignment needs the sheet to be rendered, even when it had been hidden.
  store.dispatch(updatePlanSheet({ id: sheet.id, changes: { visible: true } }));
  const id = addSheetAsUnderlay(sheet);
  if (id) store.dispatch(setAlignStory(id));
}


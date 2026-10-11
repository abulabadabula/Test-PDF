// src/features/storeys/storeySheets.ts

import { store } from '@/app/store';
import { ensureSheet } from '@/app/store/slices/pageCoordinateSlice';
import { addStory } from '@/app/store/slices/storySlice';
import { addSheetAsUnderlay } from '@/features/stories/underlayActions';

/**
 * Make sure a Plan Sheet used by a storey has a coordinate system and an
 * alignment record, so it can be shown as an underlay and aligned to the base.
 */
export function ensureStoryForSheet(sheetId: string) {
  const state = store.getState();
  const sheet = state.planSheet.sheets.find((item) => item.id === sheetId);
  if (!sheet || sheet.role !== 'structural') return;

  store.dispatch(ensureSheet({ sheetId: sheet.id, pageIndex: sheet.sourcePage }));

  if (state.story.stories.some((story) => story.sheetId === sheet.id)) return;

  if (state.planSheet.baseSheetId && state.planSheet.baseSheetId !== sheet.id) {
    // Centre it on the base sheet, ready to be aligned.
    addSheetAsUnderlay(sheet);
    return;
  }

  store.dispatch(
    addStory({ sheetId: sheet.id, pageIndex: sheet.sourcePage, name: sheet.name }),
  );
}

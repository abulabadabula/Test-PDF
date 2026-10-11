// src/app/store/slices/storySlice.ts
//
// A Story is an engineering building level associated with a virtual Plan
// Sheet. pageIndex remains optional legacy source-page metadata so older
// projects can still be interpreted and migrated.

import { createSlice, nanoid, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { PlanSheet } from '@/features/plan-sheets/planSheetTypes';

export interface StoryAdjust {
  dxMm: number;
  dyMm: number;
  rotationDeg: number;
}

export interface Story {
  id: string;
  sheetId: string;
  pageIndex?: number;
  name: string;
  elevationMm: number;
  overlayVisible: boolean;
  overlayOpacity: number;
  /** Prevent accidental changes after a floor drawing has been aligned. */
  alignmentLocked: boolean;
  tint: string;
  showGhostElements: boolean;
  adjust: StoryAdjust;
}

export interface StoryState {
  stories: Story[];
  linkToleranceMm: number;
  pullRadiusMm: number;
  showLinks: boolean;
  ghostSnap: boolean;
  /** Story whose underlay is currently being dragged into alignment. */
  alignStoryId: string | null;
}

const TINTS = [
  '#ef4444',
  '#2563eb',
  '#16a34a',
  '#f59e0b',
  '#9333ea',
  '#0891b2',
  '#db2777',
  '#65a30d',
];

const DEFAULT_STORY_HEIGHT_MM = 3000;
const ZERO_ADJUST: StoryAdjust = {
  dxMm: 0,
  dyMm: 0,
  rotationDeg: 0,
};

function createStory(
  sheetId: string,
  name: string,
  order: number,
  pageIndex?: number,
  overlayVisible = false,
): Story {
  return {
    id: nanoid(),
    sheetId,
    pageIndex,
    name,
    elevationMm: order * DEFAULT_STORY_HEIGHT_MM,
    overlayVisible,
    overlayOpacity: 0.4,
    alignmentLocked: false,
    tint: TINTS[order % TINTS.length],
    showGhostElements: true,
    adjust: { ...ZERO_ADJUST },
  };
}

const initialState: StoryState = {
  stories: [],
  linkToleranceMm: 100,
  pullRadiusMm: 500,
  showLinks: true,
  ghostSnap: true,
  alignStoryId: null,
};

export const storySlice = createSlice({
  name: 'story',
  initialState,
  reducers: {
    initStoriesFromPages: (
      state,
      action: PayloadAction<{ pageCount: number }>,
    ) => {
      for (let page = 1; page <= action.payload.pageCount; page += 1) {
        const sheetId = 'legacy-page-' + page;

        if (!state.stories.some((story) => story.sheetId === sheetId)) {
          state.stories.push(
            createStory(
              sheetId,
              'Story ' + page,
              page - 1,
              page,
            ),
          );
        }
      }

      state.stories.sort((a, b) => {
        const aa = a.pageIndex ?? Number.MAX_SAFE_INTEGER;
        const bb = b.pageIndex ?? Number.MAX_SAFE_INTEGER;
        return aa - bb;
      });
    },

    initStoriesFromPlanSheets: (
      state,
      action: PayloadAction<{ sheets: PlanSheet[] }>,
    ) => {
      const structuralSheets = action.payload.sheets
        .filter((sheet) => sheet.role === 'structural')
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

      structuralSheets.forEach((sheet, order) => {
        const existing = state.stories.find(
          (story) => story.sheetId === sheet.id,
        );

        if (existing) {
          existing.name = sheet.name;
          existing.pageIndex = sheet.sourcePage;
          return;
        }

        state.stories.push(
          createStory(
            sheet.id,
            sheet.name,
            order,
            sheet.sourcePage,
          ),
        );
      });

      state.stories.sort((a, b) => a.elevationMm - b.elevationMm);
    },

    addStory: (
      state,
      action: PayloadAction<{
        sheetId: string;
        pageIndex?: number;
        name?: string;
        /** Show the new level as an underlay straight away. */
        overlayVisible?: boolean;
        /** Initial translation / rotation of the underlay. */
        adjust?: StoryAdjust;
      }>,
    ) => {
      if (state.stories.some((story) => story.sheetId === action.payload.sheetId)) {
        return;
      }

      const story = createStory(
        action.payload.sheetId,
        action.payload.name ?? action.payload.sheetId,
        state.stories.length,
        action.payload.pageIndex,
        action.payload.overlayVisible ?? false,
      );

      if (action.payload.adjust) story.adjust = { ...action.payload.adjust };

      state.stories.push(story);

      state.stories.sort((a, b) => a.elevationMm - b.elevationMm);
    },

    updateStory: (
      state,
      action: PayloadAction<{
        id: string;
        changes: Partial<Omit<Story, 'id' | 'adjust'>>;
      }>,
    ) => {
      const story = state.stories.find((item) => item.id === action.payload.id);
      if (story) Object.assign(story, action.payload.changes);
    },

    updateStoryAdjust: (
      state,
      action: PayloadAction<{
        id: string;
        changes: Partial<StoryAdjust>;
      }>,
    ) => {
      const story = state.stories.find((item) => item.id === action.payload.id);
      if (story) Object.assign(story.adjust, action.payload.changes);
    },

    resetStoryAdjust: (state, action: PayloadAction<string>) => {
      const story = state.stories.find((item) => item.id === action.payload);
      if (story) story.adjust = { ...ZERO_ADJUST };
    },

    /** Lock/unlock a floor after manual alignment. A locked floor cannot enter drag alignment. */
    setStoryAlignmentLocked: (
      state,
      action: PayloadAction<{ id: string; locked: boolean }>,
    ) => {
      const story = state.stories.find((item) => item.id === action.payload.id);
      if (!story) return;

      story.alignmentLocked = action.payload.locked;
      if (story.alignmentLocked && state.alignStoryId === story.id) {
        state.alignStoryId = null;
      }
    },

    /** Enter / leave interactive drag-to-align mode for a story's underlay. */
    setAlignStory: (state, action: PayloadAction<string | null>) => {
      const requested = state.stories.find((item) => item.id === action.payload);
      if (requested?.alignmentLocked) {
        state.alignStoryId = null;
        return;
      }

      state.alignStoryId = action.payload;
      if (requested) requested.overlayVisible = true;
    },

    removeStory: (state, action: PayloadAction<string>) => {
      state.stories = state.stories.filter((story) => story.id !== action.payload);
      if (state.alignStoryId === action.payload) state.alignStoryId = null;
    },

    setAllOverlays: (state, action: PayloadAction<boolean>) => {
      state.stories.forEach((story) => {
        story.overlayVisible = action.payload;
      });
    },

    setLinkToleranceMm: (state, action: PayloadAction<number>) => {
      if (Number.isFinite(action.payload) && action.payload >= 0) {
        state.linkToleranceMm = action.payload;
      }
    },

    setPullRadiusMm: (state, action: PayloadAction<number>) => {
      if (Number.isFinite(action.payload) && action.payload >= 0) {
        state.pullRadiusMm = action.payload;
      }
    },

    setShowLinks: (state, action: PayloadAction<boolean>) => {
      state.showLinks = action.payload;
    },

    setGhostSnap: (state, action: PayloadAction<boolean>) => {
      state.ghostSnap = action.payload;
    },
  },
});

export const {
  initStoriesFromPages,
  initStoriesFromPlanSheets,
  addStory,
  updateStory,
  updateStoryAdjust,
  resetStoryAdjust,
  setStoryAlignmentLocked,
  setAlignStory,
  removeStory,
  setAllOverlays,
  setLinkToleranceMm,
  setPullRadiusMm,
  setShowLinks,
  setGhostSnap,
} = storySlice.actions;

export const selectStories = (state: RootState) => state.story.stories;

export const selectStoryBySheet = (state: RootState, sheetId: string) =>
  state.story.stories.find((story) => story.sheetId === sheetId);

export const selectStoryByPage = (state: RootState, pageIndex: number) =>
  state.story.stories.find((story) => story.pageIndex === pageIndex);

export { ZERO_ADJUST };

export default storySlice;

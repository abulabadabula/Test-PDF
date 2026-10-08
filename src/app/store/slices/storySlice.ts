// src/app/store/slices/storySlice.ts
//
// A "story" (building level) is a PDF page + an elevation + overlay settings.
// The page currently being edited is the BASE plan; every other visible story
// is drawn on top of it as a transparent, tinted overlay.
//
// NOTE: `pageIndex` follows the rest of the app: it is the 1-based PDF page
// number (same value as `state.pdf.currentPage` and `shape.pageIndex`).

import { createSlice, nanoid, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

export interface StoryAdjust {
  /** Offset of this level in the common engineering frame (mm). */
  dxMm: number;
  dyMm: number;
  /** Rotation of this level about the engineering origin (degrees, CCW). */
  rotationDeg: number;
}

export interface Story {
  id: string;
  pageIndex: number;
  name: string;
  elevationMm: number;
  overlayVisible: boolean;
  overlayOpacity: number;
  tint: string;
  showGhostElements: boolean;
  adjust: StoryAdjust;
}

export interface StoryState {
  stories: Story[];
  /** Two nodes on different levels closer than this are "vertically linked". */
  linkToleranceMm: number;
  /** "Pull nodes" moves nodes of other levels that lie within this radius. */
  pullRadiusMm: number;
  showLinks: boolean;
  ghostSnap: boolean;
}

const TINTS = ['#ef4444', '#2563eb', '#16a34a', '#f59e0b', '#9333ea', '#0891b2', '#db2777', '#65a30d'];
const DEFAULT_STORY_HEIGHT_MM = 3000;

const ZERO_ADJUST: StoryAdjust = { dxMm: 0, dyMm: 0, rotationDeg: 0 };

function createStory(pageIndex: number, order: number): Story {
  return {
    id: nanoid(),
    pageIndex,
    name: `Story ${pageIndex}`,
    elevationMm: order * DEFAULT_STORY_HEIGHT_MM,
    overlayVisible: false,
    overlayOpacity: 0.4,
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
};

export const storySlice = createSlice({
  name: 'story',
  initialState,
  reducers: {
    /** Create one story for every PDF page that does not have one yet. */
    initStoriesFromPages: (state, action: PayloadAction<{ pageCount: number }>) => {
      for (let page = 1; page <= action.payload.pageCount; page += 1) {
        if (!state.stories.some((s) => s.pageIndex === page)) {
          state.stories.push(createStory(page, page - 1));
        }
      }
      state.stories.sort((a, b) => a.pageIndex - b.pageIndex);
    },
    addStory: (state, action: PayloadAction<{ pageIndex: number }>) => {
      if (state.stories.some((s) => s.pageIndex === action.payload.pageIndex)) return;
      state.stories.push(createStory(action.payload.pageIndex, state.stories.length));
      state.stories.sort((a, b) => a.pageIndex - b.pageIndex);
    },
    updateStory: (state, action: PayloadAction<{ id: string; changes: Partial<Omit<Story, 'id' | 'adjust'>> }>) => {
      const story = state.stories.find((s) => s.id === action.payload.id);
      if (story) Object.assign(story, action.payload.changes);
    },
    updateStoryAdjust: (state, action: PayloadAction<{ id: string; changes: Partial<StoryAdjust> }>) => {
      const story = state.stories.find((s) => s.id === action.payload.id);
      if (story) Object.assign(story.adjust, action.payload.changes);
    },
    removeStory: (state, action: PayloadAction<string>) => {
      state.stories = state.stories.filter((s) => s.id !== action.payload);
    },
    setAllOverlays: (state, action: PayloadAction<boolean>) => {
      state.stories.forEach((s) => { s.overlayVisible = action.payload; });
    },
    setLinkToleranceMm: (state, action: PayloadAction<number>) => {
      if (Number.isFinite(action.payload) && action.payload >= 0) state.linkToleranceMm = action.payload;
    },
    setPullRadiusMm: (state, action: PayloadAction<number>) => {
      if (Number.isFinite(action.payload) && action.payload >= 0) state.pullRadiusMm = action.payload;
    },
    setShowLinks: (state, action: PayloadAction<boolean>) => { state.showLinks = action.payload; },
    setGhostSnap: (state, action: PayloadAction<boolean>) => { state.ghostSnap = action.payload; },
  },
});

export const {
  initStoriesFromPages, addStory, updateStory, updateStoryAdjust, removeStory,
  setAllOverlays, setLinkToleranceMm, setPullRadiusMm, setShowLinks, setGhostSnap,
} = storySlice.actions;

export const selectStories = (s: RootState) => s.story.stories;
export const selectStoryByPage = (s: RootState, pageIndex: number) =>
  s.story.stories.find((st) => st.pageIndex === pageIndex);

export { ZERO_ADJUST };
export default storySlice;

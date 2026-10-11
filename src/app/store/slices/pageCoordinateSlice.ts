// src/app/store/slices/pageCoordinateSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { EngineeringUnit } from '@/core/coordinate/engineeringScale';
import {
  createDefaultPageCoordinateSystem,
  sanitizePageCoordinateSystem,
  type PageCoordinateSystem,
} from '@/core/coordinate/pageCoordinateSystem';

export interface PageCoordinateState {
  /** Legacy page-level coordinate systems retained for existing projects. */
  pages: Record<number, PageCoordinateSystem>;

  /** Engineering coordinate systems for virtual Plan Sheets. */
  sheets: Record<string, PageCoordinateSystem>;

  /**
   * When true, the next click on the PDF canvas becomes the active
   * page/sheet engineering origin.
   */
  originMode: boolean;
}

const initialState: PageCoordinateState = {
  pages: {},
  sheets: {},
  originMode: false,
};

export const pageCoordinateSlice = createSlice({
  name: 'pageCoordinate',
  initialState,
  reducers: {
    ensurePage: (
      state,
      action: PayloadAction<{ pageIndex: number }>,
    ) => {
      if (!state.pages[action.payload.pageIndex]) {
        state.pages[action.payload.pageIndex] =
          createDefaultPageCoordinateSystem();
      }
    },

    ensureSheet: (
      state,
      action: PayloadAction<{
        sheetId: string;
        pageIndex?: number;
      }>,
    ) => {
      if (state.sheets[action.payload.sheetId]) return;

      const source =
        typeof action.payload.pageIndex === 'number'
          ? state.pages[action.payload.pageIndex]
          : undefined;

      state.sheets[action.payload.sheetId] = source
        ? sanitizePageCoordinateSystem(source)
        : createDefaultPageCoordinateSystem();
    },

    setPageScale: (
      state,
      action: PayloadAction<{
        pageIndex: number;
        numerator: number;
        denominator: number;
      }>,
    ) => {
      const { pageIndex, numerator, denominator } = action.payload;
      const current =
        state.pages[pageIndex] ??
        createDefaultPageCoordinateSystem();

      state.pages[pageIndex] = sanitizePageCoordinateSystem({
        ...current,
        scaleNumerator: numerator,
        scaleDenominator: denominator,
      });
    },

    setSheetScale: (
      state,
      action: PayloadAction<{
        sheetId: string;
        numerator: number;
        denominator: number;
      }>,
    ) => {
      const { sheetId, numerator, denominator } = action.payload;
      const current =
        state.sheets[sheetId] ??
        createDefaultPageCoordinateSystem();

      state.sheets[sheetId] = sanitizePageCoordinateSystem({
        ...current,
        scaleNumerator: numerator,
        scaleDenominator: denominator,
      });
    },

    setPageUnit: (
      state,
      action: PayloadAction<{
        pageIndex: number;
        unit: EngineeringUnit;
      }>,
    ) => {
      const { pageIndex, unit } = action.payload;
      const current =
        state.pages[pageIndex] ??
        createDefaultPageCoordinateSystem();

      state.pages[pageIndex] = sanitizePageCoordinateSystem({
        ...current,
        unit,
      });
    },

    setSheetUnit: (
      state,
      action: PayloadAction<{
        sheetId: string;
        unit: EngineeringUnit;
      }>,
    ) => {
      const { sheetId, unit } = action.payload;
      const current =
        state.sheets[sheetId] ??
        createDefaultPageCoordinateSystem();

      state.sheets[sheetId] = sanitizePageCoordinateSystem({
        ...current,
        unit,
      });
    },

    setPageOrigin: (
      state,
      action: PayloadAction<{
        pageIndex: number;
        x: number;
        y: number;
      }>,
    ) => {
      const { pageIndex, x, y } = action.payload;
      const current =
        state.pages[pageIndex] ??
        createDefaultPageCoordinateSystem();

      state.pages[pageIndex] = sanitizePageCoordinateSystem({
        ...current,
        origin: { x, y },
        engineeringOrigin: { x: 0, y: 0 },
      });

      state.originMode = false;
    },

    setSheetOrigin: (
      state,
      action: PayloadAction<{
        sheetId: string;
        x: number;
        y: number;
      }>,
    ) => {
      const { sheetId, x, y } = action.payload;
      const current =
        state.sheets[sheetId] ??
        createDefaultPageCoordinateSystem();

      state.sheets[sheetId] = sanitizePageCoordinateSystem({
        ...current,
        origin: { x, y },
        engineeringOrigin: { x: 0, y: 0 },
      });

      state.originMode = false;
    },

    /**
     * Move a sheet's origin marker without resetting its engineering origin or
     * leaving origin-pick mode. Used when a sheet is translated into alignment.
     */
    moveSheetOrigin: (
      state,
      action: PayloadAction<{
        sheetId: string;
        x: number;
        y: number;
      }>,
    ) => {
      const { sheetId, x, y } = action.payload;
      const current =
        state.sheets[sheetId] ??
        createDefaultPageCoordinateSystem();

      state.sheets[sheetId] = sanitizePageCoordinateSystem({
        ...current,
        origin: { x, y },
      });
    },

    setEngineeringOrigin: (
      state,
      action: PayloadAction<{
        pageIndex: number;
        x: number;
        y: number;
      }>,
    ) => {
      const { pageIndex, x, y } = action.payload;
      const current =
        state.pages[pageIndex] ??
        createDefaultPageCoordinateSystem();

      state.pages[pageIndex] = sanitizePageCoordinateSystem({
        ...current,
        engineeringOrigin: { x, y },
      });
    },

    setSheetEngineeringOrigin: (
      state,
      action: PayloadAction<{
        sheetId: string;
        x: number;
        y: number;
      }>,
    ) => {
      const { sheetId, x, y } = action.payload;
      const current =
        state.sheets[sheetId] ??
        createDefaultPageCoordinateSystem();

      state.sheets[sheetId] = sanitizePageCoordinateSystem({
        ...current,
        engineeringOrigin: { x, y },
      });
    },

    setOriginMode: (
      state,
      action: PayloadAction<boolean>,
    ) => {
      state.originMode = action.payload;
    },

    clearPageOrigin: (
      state,
      action: PayloadAction<{ pageIndex: number }>,
    ) => {
      const { pageIndex } = action.payload;
      const current =
        state.pages[pageIndex] ??
        createDefaultPageCoordinateSystem();

      state.pages[pageIndex] = sanitizePageCoordinateSystem({
        ...current,
        origin: { x: 0, y: 0 },
        engineeringOrigin: { x: 0, y: 0 },
      });
    },

    clearSheetOrigin: (
      state,
      action: PayloadAction<{ sheetId: string }>,
    ) => {
      const { sheetId } = action.payload;
      const current =
        state.sheets[sheetId] ??
        createDefaultPageCoordinateSystem();

      state.sheets[sheetId] = sanitizePageCoordinateSystem({
        ...current,
        origin: { x: 0, y: 0 },
        engineeringOrigin: { x: 0, y: 0 },
      });
    },
  },
});

export const {
  ensurePage,
  ensureSheet,
  setPageScale,
  setSheetScale,
  setPageUnit,
  setSheetUnit,
  setPageOrigin,
  setSheetOrigin,
  moveSheetOrigin,
  setEngineeringOrigin,
  setSheetEngineeringOrigin,
  setOriginMode,
  clearPageOrigin,
  clearSheetOrigin,
} = pageCoordinateSlice.actions;

export const selectPageCoordinateSystem = (
  state: RootState,
  pageIndex: number,
): PageCoordinateSystem =>
  state.pageCoordinate.pages[pageIndex] ??
  createDefaultPageCoordinateSystem();

export const selectSheetCoordinateSystem = (
  state: RootState,
  sheetId: string,
  pageIndex?: number,
): PageCoordinateSystem =>
  state.pageCoordinate.sheets[sheetId] ??
  (typeof pageIndex === 'number'
    ? selectPageCoordinateSystem(state, pageIndex)
    : createDefaultPageCoordinateSystem());

export const selectCoordinateSystem = (
  state: RootState,
  pageIndex: number,
  sheetId?: string | null,
): PageCoordinateSystem =>
  sheetId
    ? selectSheetCoordinateSystem(state, sheetId, pageIndex)
    : selectPageCoordinateSystem(state, pageIndex);

export const selectOriginMode = (state: RootState) =>
  state.pageCoordinate.originMode;

export default pageCoordinateSlice;

import { createSlice, nanoid, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type {
  CropRect,
  CropSession,
  PlanSheet,
  PlanSheetRole,
  PlanSheetState,
} from '@/features/plan-sheets/planSheetTypes';

const MIN_CROP_SIZE = 8;

const clampCrop = (crop: CropRect): CropRect => ({
  x: Math.max(0, crop.x),
  y: Math.max(0, crop.y),
  width: Math.max(MIN_CROP_SIZE, crop.width),
  height: Math.max(MIN_CROP_SIZE, crop.height),
});

const initialState: PlanSheetState = {
  sheets: [],
  baseSheetId: null,
  activeSheetId: null,
  cropMode: false,
  cropSelection: null,
  cropSession: null,
};

export const planSheetSlice = createSlice({
  name: 'planSheet',
  initialState,
  reducers: {
    addPlanSheet: (
      state,
      action: PayloadAction<{
        id?: string;
        name: string;
        sourcePage: number;
        crop: CropRect;
        rotation?: number;
        role?: PlanSheetRole;
      }>,
    ) => {
      const now = new Date().toISOString();
      const sheet: PlanSheet = {
        id: action.payload.id ?? nanoid(),
        name: action.payload.name.trim() || `Plan ${action.payload.sourcePage}`,
        sourcePage: action.payload.sourcePage,
        crop: clampCrop(action.payload.crop),
        rotation: action.payload.rotation ?? 0,
        role: action.payload.role ?? 'structural',
        visible: true,
        createdAt: now,
        updatedAt: now,
      };

      state.sheets.push(sheet);
      state.activeSheetId = sheet.id;
    },

    updatePlanSheet: (
      state,
      action: PayloadAction<{
        id: string;
        changes: Partial<Omit<PlanSheet, 'id' | 'createdAt' | 'updatedAt'>>;
      }>,
    ) => {
      const sheet = state.sheets.find((item) => item.id === action.payload.id);
      if (!sheet) return;

      if (action.payload.changes.crop) {
        sheet.crop = clampCrop(action.payload.changes.crop);
      }

      Object.assign(sheet, action.payload.changes);
      sheet.updatedAt = new Date().toISOString();
    },

    removePlanSheet: (state, action: PayloadAction<string>) => {
      state.sheets = state.sheets.filter((sheet) => sheet.id !== action.payload);

      // Require an explicit choice if the designated base floor is deleted.
      if (state.baseSheetId === action.payload) state.baseSheetId = null;

      if (state.activeSheetId === action.payload) {
        state.activeSheetId = state.sheets[0]?.id ?? null;
      }

      if (state.cropSession?.sheetId === action.payload) {
        state.cropSession = null;
        state.cropSelection = null;
        state.cropMode = false;
      }
    },

    duplicatePlanSheet: (
      state,
      action: PayloadAction<{ id: string; name?: string }>,
    ) => {
      const source = state.sheets.find((sheet) => sheet.id === action.payload.id);
      if (!source) return;

      const now = new Date().toISOString();
      const copy: PlanSheet = {
        ...source,
        id: nanoid(),
        name: action.payload.name?.trim() || `${source.name} Copy`,
        crop: { ...source.crop },
        createdAt: now,
        updatedAt: now,
      };

      state.sheets.push(copy);
      state.activeSheetId = copy.id;
    },

    setActivePlanSheet: (state, action: PayloadAction<string | null>) => {
      state.activeSheetId = action.payload;
    },

    setBasePlanSheet: (state, action: PayloadAction<string | null>) => {
      state.baseSheetId = action.payload;
    },

    activatePlanSheetForPage: (state, action: PayloadAction<number>) => {
      const first = state.sheets.find((sheet) => sheet.sourcePage === action.payload);
      state.activeSheetId = first?.id ?? null;
    },

    setCropMode: (state, action: PayloadAction<boolean>) => {
      state.cropMode = action.payload;

      if (!action.payload) {
        state.cropSession = null;
        state.cropSelection = null;
      }
    },

    beginCrop: (
      state,
      action: PayloadAction<CropSession>,
    ) => {
      state.cropMode = true;
      state.cropSession = action.payload;

      const existing = action.payload.sheetId
        ? state.sheets.find((sheet) => sheet.id === action.payload.sheetId)
        : undefined;

      state.cropSelection = existing ? { ...existing.crop } : null;
    },

    setCropSelection: (state, action: PayloadAction<CropRect | null>) => {
      state.cropSelection = action.payload
        ? clampCrop(action.payload)
        : null;
    },

    cancelCrop: (state) => {
      state.cropMode = false;
      state.cropSession = null;
      state.cropSelection = null;
    },

    finishCrop: (state) => {
      state.cropMode = false;
      state.cropSession = null;
      state.cropSelection = null;
    },
  },
});

export const {
  addPlanSheet,
  updatePlanSheet,
  removePlanSheet,
  duplicatePlanSheet,
  setActivePlanSheet,
  setBasePlanSheet,
  activatePlanSheetForPage,
  setCropMode,
  beginCrop,
  setCropSelection,
  cancelCrop,
  finishCrop,
} = planSheetSlice.actions;

export const selectPlanSheets = (state: RootState) => state.planSheet.sheets;

export const selectActivePlanSheet = (state: RootState) =>
  state.planSheet.sheets.find((sheet) => sheet.id === state.planSheet.activeSheetId) ?? null;

export const selectBasePlanSheet = (state: RootState) =>
  state.planSheet.sheets.find((sheet) => sheet.id === state.planSheet.baseSheetId) ?? null;

export const selectPlanSheetsForPage = (state: RootState, sourcePage: number) =>
  state.planSheet.sheets.filter((sheet) => sheet.sourcePage === sourcePage);

export const selectCropMode = (state: RootState) => state.planSheet.cropMode;
export const selectCropSelection = (state: RootState) => state.planSheet.cropSelection;
export const selectCropSession = (state: RootState) => state.planSheet.cropSession;

export default planSheetSlice;

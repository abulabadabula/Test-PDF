// src/app/store/slices/storeySlice.ts
//
// ETABS-style storey list.
//
// A storey is a building level. Storeys are stored from the bottom up; the
// elevation of every storey is derived from the base elevation plus the stacked
// storey heights (the elevation is the top level of the storey, as in ETABS).
//
// Each *master* storey is drawn on one Plan Sheet. A storey can instead be
// "similar to" a master storey: it then shares the master's Plan Sheet, so a
// typical floor plan that stands for several floors only has to be drawn once.

import { createSlice, nanoid, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import { removePlanSheet } from './planSheetSlice';

export interface Storey {
  id: string;
  name: string;
  /** Floor-to-floor height of this storey, in mm. */
  heightMm: number;
  /** Derived top elevation in mm. Never edit directly; use setStoreyElevation. */
  elevationMm: number;
  /** Plan Sheet drawn for this storey. Ignored when `similarTo` is set. */
  sheetId: string | null;
  /** Id of the master storey this one is a copy of, or null for a master. */
  similarTo: string | null;
}

export interface StoreyState {
  /** Ordered from the lowest storey to the highest. */
  storeys: Storey[];
  baseElevationMm: number;
  /** Storey currently being edited / used as the paste target. */
  activeStoreyId: string | null;
}

export const DEFAULT_STOREY_HEIGHT_MM = 3000;

const initialState: StoreyState = {
  storeys: [],
  baseElevationMm: 0,
  activeStoreyId: null,
};

function recalculate(state: StoreyState) {
  let elevation = state.baseElevationMm;

  for (const storey of state.storeys) {
    elevation += storey.heightMm;
    storey.elevationMm = elevation;
  }
}

function makeStoreyName(storeys: Storey[], preferred?: string): string {
  const used = new Set(storeys.map((storey) => storey.name.toLowerCase()));

  if (preferred && !used.has(preferred.toLowerCase())) return preferred;

  let index = storeys.length + 1;
  while (used.has(`story${index}`)) index += 1;

  return `Story${index}`;
}

function newStorey(
  storeys: Storey[],
  options: { name?: string; heightMm?: number; sheetId?: string | null },
): Storey {
  return {
    id: nanoid(),
    name: makeStoreyName(storeys, options.name),
    heightMm:
      options.heightMm && options.heightMm > 0
        ? options.heightMm
        : DEFAULT_STOREY_HEIGHT_MM,
    elevationMm: 0,
    sheetId: options.sheetId ?? null,
    similarTo: null,
  };
}

/** Re-point storeys that were similar to `fromId` at another master (or free them). */
function reassignFollowers(
  state: StoreyState,
  fromId: string,
  toId: string | null,
  inheritSheetId: string | null,
) {
  for (const storey of state.storeys) {
    if (storey.similarTo !== fromId) continue;

    storey.similarTo = toId;
    if (!toId) storey.sheetId = inheritSheetId;
  }
}

export const storeySlice = createSlice({
  name: 'storey',
  initialState,
  reducers: {
    addStorey: (
      state,
      action: PayloadAction<{
        name?: string;
        heightMm?: number;
        sheetId?: string | null;
        /** Insert directly above / below this storey. Defaults to the top. */
        aboveId?: string;
        belowId?: string;
      }>,
    ) => {
      const storey = newStorey(state.storeys, action.payload);

      if (action.payload.aboveId) {
        const index = state.storeys.findIndex(
          (item) => item.id === action.payload.aboveId,
        );
        state.storeys.splice(index < 0 ? state.storeys.length : index + 1, 0, storey);
      } else if (action.payload.belowId) {
        const index = state.storeys.findIndex(
          (item) => item.id === action.payload.belowId,
        );
        state.storeys.splice(index < 0 ? 0 : index, 0, storey);
      } else {
        state.storeys.push(storey);
      }

      recalculate(state);
      state.activeStoreyId = storey.id;
    },

    /** Create one storey per sheet that is not yet used by any storey. */
    addStoreysFromSheets: (
      state,
      action: PayloadAction<{
        sheets: { id: string; name: string }[];
        heightMm?: number;
      }>,
    ) => {
      for (const sheet of action.payload.sheets) {
        const alreadyUsed = state.storeys.some(
          (storey) => !storey.similarTo && storey.sheetId === sheet.id,
        );

        if (alreadyUsed) continue;

        state.storeys.push(
          newStorey(state.storeys, {
            name: sheet.name,
            heightMm: action.payload.heightMm,
            sheetId: sheet.id,
          }),
        );
      }

      recalculate(state);
      if (!state.activeStoreyId) state.activeStoreyId = state.storeys[0]?.id ?? null;
    },

    updateStorey: (
      state,
      action: PayloadAction<{
        id: string;
        changes: Partial<Pick<Storey, 'name' | 'heightMm' | 'sheetId'>>;
      }>,
    ) => {
      const storey = state.storeys.find((item) => item.id === action.payload.id);
      if (!storey) return;

      const { name, heightMm, sheetId } = action.payload.changes;

      if (typeof name === 'string') {
        const value = name.trim();
        const taken = state.storeys.some(
          (item) =>
            item.id !== storey.id &&
            item.name.toLowerCase() === value.toLowerCase(),
        );
        if (value && !taken) storey.name = value;
      }

      if (typeof heightMm === 'number' && Number.isFinite(heightMm) && heightMm > 0) {
        storey.heightMm = heightMm;
      }

      if (sheetId !== undefined && !storey.similarTo) {
        storey.sheetId = sheetId;
      }

      recalculate(state);
    },

    /** Edit the elevation of a storey; its height absorbs the change. */
    setStoreyElevation: (
      state,
      action: PayloadAction<{ id: string; elevationMm: number }>,
    ) => {
      const index = state.storeys.findIndex((item) => item.id === action.payload.id);
      if (index < 0 || !Number.isFinite(action.payload.elevationMm)) return;

      const below = index === 0
        ? state.baseElevationMm
        : state.storeys[index - 1].elevationMm;
      const height = action.payload.elevationMm - below;

      if (height > 0) {
        state.storeys[index].heightMm = height;
        recalculate(state);
      }
    },

    /** Make a storey similar to a master storey (null makes it a master again). */
    setStoreySimilarTo: (
      state,
      action: PayloadAction<{ id: string; masterId: string | null }>,
    ) => {
      const storey = state.storeys.find((item) => item.id === action.payload.id);
      if (!storey) return;

      const masterId = action.payload.masterId;

      if (!masterId) {
        if (storey.similarTo) {
          const master = state.storeys.find((item) => item.id === storey.similarTo);
          storey.sheetId = master?.sheetId ?? storey.sheetId;
          storey.similarTo = null;
        }
        return;
      }

      const master = state.storeys.find((item) => item.id === masterId);
      if (!master || master.id === storey.id || master.similarTo) return;

      // Storeys that followed this one now follow the new master.
      reassignFollowers(state, storey.id, master.id, null);

      storey.similarTo = master.id;
      storey.sheetId = null;
    },

    moveStorey: (
      state,
      action: PayloadAction<{ id: string; direction: 'up' | 'down' }>,
    ) => {
      const index = state.storeys.findIndex((item) => item.id === action.payload.id);
      if (index < 0) return;

      const target = action.payload.direction === 'up' ? index + 1 : index - 1;
      if (target < 0 || target >= state.storeys.length) return;

      const [moved] = state.storeys.splice(index, 1);
      state.storeys.splice(target, 0, moved);
      recalculate(state);
    },

    removeStorey: (state, action: PayloadAction<string>) => {
      const storey = state.storeys.find((item) => item.id === action.payload);
      if (!storey) return;

      // Followers of a master take over its Plan Sheet, the first one becoming
      // the new master of the rest.
      const followers = state.storeys.filter((item) => item.similarTo === storey.id);
      if (followers.length) {
        const [newMaster, ...rest] = followers;
        newMaster.similarTo = null;
        newMaster.sheetId = storey.sheetId;
        rest.forEach((item) => {
          item.similarTo = newMaster.id;
        });
      }

      state.storeys = state.storeys.filter((item) => item.id !== action.payload);
      if (state.activeStoreyId === action.payload) {
        state.activeStoreyId = null;
      }

      recalculate(state);
    },

    setBaseElevation: (state, action: PayloadAction<number>) => {
      if (!Number.isFinite(action.payload)) return;
      state.baseElevationMm = action.payload;
      recalculate(state);
    },

    setActiveStorey: (state, action: PayloadAction<string | null>) => {
      state.activeStoreyId = action.payload;
    },
  },

  extraReducers: (builder) => {
    // A deleted Plan Sheet can no longer be drawn on by any storey.
    builder.addCase(removePlanSheet, (state, action) => {
      for (const storey of state.storeys) {
        if (storey.sheetId === action.payload) storey.sheetId = null;
      }
    });
  },
});

export const {
  addStorey,
  addStoreysFromSheets,
  updateStorey,
  setStoreyElevation,
  setStoreySimilarTo,
  moveStorey,
  removeStorey,
  setBaseElevation,
  setActiveStorey,
} = storeySlice.actions;

export const selectStoreys = (state: RootState) => state.storey.storeys;
export const selectActiveStoreyId = (state: RootState) => state.storey.activeStoreyId;

/** Plan Sheet a storey is drawn on, following the "similar to" link. */
export function effectiveSheetId(
  storey: Storey,
  storeys: Storey[],
): string | null {
  if (!storey.similarTo) return storey.sheetId;

  return storeys.find((item) => item.id === storey.similarTo)?.sheetId ?? null;
}

export default storeySlice;

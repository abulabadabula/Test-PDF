import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { nanoid } from 'nanoid';

export type LoadCaseType =
  | 'Dead'
  | 'Superimposed Dead'
  | 'Live'
  | 'Wind'
  | 'Seismic'
  | 'Temperature'
  | 'Other';

export interface LoadCase {
  id: string;
  name: string;
  type: LoadCaseType;
  selfWeightMultiplier: number;
  description: string;
  source: 'default' | 'user';
  createdAt: string;
}

export interface LoadCombinationTerm {
  loadCaseId: string;
  factor: number;
}

export interface LoadCombination {
  id: string;
  name: string;
  type: 'Ultimate' | 'Serviceability' | 'Other';
  terms: LoadCombinationTerm[];
  description: string;
  source: 'default' | 'user';
  createdAt: string;
}

export interface LoadsState {
  loadCases: LoadCase[];
  loadCombinations: LoadCombination[];
}

const DEFAULT_CREATED_AT = new Date().toISOString();

const initialLoadCases: LoadCase[] = [
  {
    id: 'lc-dead',
    name: 'Dead',
    type: 'Dead',
    selfWeightMultiplier: 1,
    description: 'Permanent gravity actions and member self-weight.',
    source: 'default',
    createdAt: DEFAULT_CREATED_AT,
  },
  {
    id: 'lc-sdead',
    name: 'Superimposed Dead',
    type: 'Superimposed Dead',
    selfWeightMultiplier: 0,
    description: 'Permanent imposed actions excluding member self-weight.',
    source: 'default',
    createdAt: DEFAULT_CREATED_AT,
  },
  {
    id: 'lc-live',
    name: 'Live',
    type: 'Live',
    selfWeightMultiplier: 0,
    description: 'Imposed / occupancy actions.',
    source: 'default',
    createdAt: DEFAULT_CREATED_AT,
  },
  {
    id: 'lc-wind',
    name: 'Wind',
    type: 'Wind',
    selfWeightMultiplier: 0,
    description: 'Wind actions.',
    source: 'default',
    createdAt: DEFAULT_CREATED_AT,
  },
  {
    id: 'lc-seismic',
    name: 'Seismic',
    type: 'Seismic',
    selfWeightMultiplier: 0,
    description: 'Earthquake / seismic actions.',
    source: 'default',
    createdAt: DEFAULT_CREATED_AT,
  },
];

const initialState: LoadsState = {
  loadCases: initialLoadCases,
  loadCombinations: [],
};

export const loadsSlice = createSlice({
  name: 'loads',
  initialState,
  reducers: {
    addLoadCase: (
      state,
      action: PayloadAction<Omit<LoadCase, 'id' | 'createdAt' | 'source'>>,
    ) => {
      state.loadCases.push({
        ...action.payload,
        id: nanoid(),
        source: 'user',
        createdAt: new Date().toISOString(),
      });
    },

    updateLoadCase: (
      state,
      action: PayloadAction<{
        id: string;
        changes: Partial<Omit<LoadCase, 'id' | 'createdAt' | 'source'>>;
      }>,
    ) => {
      const index = state.loadCases.findIndex((item) => item.id === action.payload.id);
      if (index !== -1) {
        Object.assign(state.loadCases[index], action.payload.changes);
      }
    },

    deleteLoadCase: (state, action: PayloadAction<string>) => {
      const id = action.payload;

      state.loadCases = state.loadCases.filter((item) => item.id !== id);

      state.loadCombinations = state.loadCombinations
        .map((combination) => ({
          ...combination,
          terms: combination.terms.filter((term) => term.loadCaseId !== id),
        }))
        .filter((combination) => combination.terms.length > 0);
    },

    addLoadCombination: (
      state,
      action: PayloadAction<Omit<LoadCombination, 'id' | 'createdAt' | 'source'>>,
    ) => {
      state.loadCombinations.push({
        ...action.payload,
        id: nanoid(),
        source: 'user',
        createdAt: new Date().toISOString(),
      });
    },

    updateLoadCombination: (
      state,
      action: PayloadAction<{
        id: string;
        changes: Partial<Omit<LoadCombination, 'id' | 'createdAt' | 'source'>>;
      }>,
    ) => {
      const index = state.loadCombinations.findIndex(
        (item) => item.id === action.payload.id,
      );

      if (index !== -1) {
        Object.assign(state.loadCombinations[index], action.payload.changes);
      }
    },

    deleteLoadCombination: (state, action: PayloadAction<string>) => {
      state.loadCombinations = state.loadCombinations.filter(
        (item) => item.id !== action.payload,
      );
    },
  },
});

export const {
  addLoadCase,
  updateLoadCase,
  deleteLoadCase,
  addLoadCombination,
  updateLoadCombination,
  deleteLoadCombination,
} = loadsSlice.actions;

export default loadsSlice.reducer;

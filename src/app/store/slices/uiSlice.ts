import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

export interface UiState {
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  toolbarCollapsed: boolean;
  treeViewExpanded: boolean;
  aiPanelOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  snapEnabled: boolean;
  snapTypes: {
    endpoint: boolean;
    midpoint: boolean;
    center: boolean;
    intersection: boolean;
    nearest: boolean;
    grid: boolean;
  };
  showElementLabels: boolean;
  showElementSections: boolean;
  dimPdfBackground: boolean;
}

const initialState: UiState = {
  leftPanelOpen: true,
  rightPanelOpen: true,
  toolbarCollapsed: false,
  treeViewExpanded: true,
  aiPanelOpen: false,
  theme: 'system',
  showGrid: true,
  snapToGrid: false,
  gridSize: 20,
  snapEnabled: true,
  snapTypes: {
    endpoint: true,
    midpoint: true,
    center: true,
    intersection: true,
    nearest: true,
    grid: false,
  },
  showElementLabels: true,
  showElementSections: true,
  dimPdfBackground: false,
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleLeftPanel: (state) => { state.leftPanelOpen = !state.leftPanelOpen; },
    toggleRightPanel: (state) => { state.rightPanelOpen = !state.rightPanelOpen; },
    toggleToolbar: (state) => { state.toolbarCollapsed = !state.toolbarCollapsed; },
    toggleTreeView: (state) => { state.treeViewExpanded = !state.treeViewExpanded; },
    toggleAiPanel: (state) => { state.aiPanelOpen = !state.aiPanelOpen; },
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => { state.theme = action.payload; },
    toggleGrid: (state) => { state.showGrid = !state.showGrid; },
    toggleSnapToGrid: (state) => {
      state.snapToGrid = !state.snapToGrid;
      state.snapTypes.grid = state.snapToGrid;
    },
    setGridSize: (state, action: PayloadAction<number>) => {
      if (Number.isFinite(action.payload) && action.payload > 0) state.gridSize = action.payload;
    },
    toggleSnap: (state) => { state.snapEnabled = !state.snapEnabled; },
    toggleSnapType: (state, action: PayloadAction<keyof UiState['snapTypes']>) => {
      state.snapTypes[action.payload] = !state.snapTypes[action.payload];
      if (action.payload === 'grid') state.snapToGrid = state.snapTypes.grid;
    },
    toggleShowElementLabels: (state) => { state.showElementLabels = !state.showElementLabels; },
    toggleShowElementSections: (state) => { state.showElementSections = !state.showElementSections; },
    toggleDimPdfBackground: (state) => { state.dimPdfBackground = !state.dimPdfBackground; },
  },
});

export const {
  toggleLeftPanel,
  toggleRightPanel,
  toggleToolbar,
  toggleTreeView,
  toggleAiPanel,
  setTheme,
  toggleGrid,
  toggleSnapToGrid,
  setGridSize,
  toggleSnap,
  toggleSnapType,
  toggleShowElementLabels,
  toggleShowElementSections,
  toggleDimPdfBackground,
} = uiSlice.actions;

export default uiSlice;

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { nanoid } from 'nanoid';

export type LoadAssignmentTargetType = 'node' | 'column' | 'beam' | 'wall' | 'slab' | 'portalFrame';
export type LoadAssignmentType = 'Joint Load' | 'Frame Point Load' | 'Frame Distributed Load' | 'Area Load';
export type LoadDirection = 'Global X' | 'Global Y' | 'Global Z' | 'Local 1' | 'Local 2' | 'Local 3';

export interface LoadAssignment {
  id: string;
  targetId: string;
  targetType: LoadAssignmentTargetType;
  loadCaseId: string;
  loadType: LoadAssignmentType;
  fx?: number; fy?: number; fz?: number;
  mx?: number; my?: number; mz?: number;
  direction?: LoadDirection;
  distanceFromStart?: number; // For Frame Point Load: relative distance (0 to 1)
  startRelativePosition?: number; // For Frame Distributed Load: relative position (0 to 1)
  endRelativePosition?: number; // For Frame Distributed Load: relative position (0 to 1)
  magnitudeStart?: number;
  magnitudeEnd?: number;
  pressure?: number;
  description?: string;
  createdAt: string;
  source: 'user';
}

export interface LoadAssignmentsState { assignments: LoadAssignment[]; }

const initialState: LoadAssignmentsState = { assignments: [] };

export const loadAssignmentsSlice = createSlice({
  name: 'loadAssignments',
  initialState,
  reducers: {
    addLoadAssignment: (
      state,
      action: PayloadAction<Omit<LoadAssignment, 'id' | 'createdAt' | 'source'>>
    ) => {
      state.assignments.push({
        ...action.payload,
        id: nanoid(),
        createdAt: new Date().toISOString(),
        source: 'user',
      });
    },
    deleteLoadAssignment: (state, action: PayloadAction<string>) => {
      state.assignments = state.assignments.filter((item) => item.id !== action.payload);
    },

    updateLoadAssignment: (
      state,
      action: PayloadAction<{
        id: string;
        changes: Partial<Omit<LoadAssignment, 'id' | 'createdAt' | 'source'>>;
      }>,
    ) => {
      const index = state.assignments.findIndex(
        (item) => item.id === action.payload.id,
      );

      if (index !== -1) {
        Object.assign(state.assignments[index], action.payload.changes);
      }
    },
    deleteAssignmentsForTarget: (state, action: PayloadAction<string>) => {
      state.assignments = state.assignments.filter((item) => item.targetId !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(
      (action): action is PayloadAction<string> => action.type === 'loads/deleteLoadCase',
      (state, action) => {
        state.assignments = state.assignments.filter(
          (assignment) => assignment.loadCaseId !== action.payload,
        );
      },
    );
    builder.addMatcher(
      (action): action is PayloadAction<string> => action.type === 'drawing/deleteShape',
      (state, action) => {
        state.assignments = state.assignments.filter(
          (assignment) => assignment.targetId !== action.payload,
        );
      },
    );
  },
});

export const {
  addLoadAssignment,
  updateLoadAssignment,
  deleteLoadAssignment,
  deleteAssignmentsForTarget,
} = loadAssignmentsSlice.actions;

export default loadAssignmentsSlice.reducer;

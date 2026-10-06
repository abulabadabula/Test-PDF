// src/app/store/index.ts

import { configureStore } from '@reduxjs/toolkit';

import { pdfSlice } from './slices/pdfSlice';
import { drawingSlice, undoableMiddleware } from './slices/drawingSlice';
import { layerSlice } from './slices/layerSlice';
import { uiSlice } from './slices/uiSlice';
import { aiSlice } from './slices/aiSlice';
import { pageCoordinateSlice } from './slices/pageCoordinateSlice';
import { propertiesSlice } from './slices/propertiesSlice';
import { loadsSlice } from './slices/loadSlice';
import loadAssignmentsReducer from './slices/loadAssignmentsSlice';

export const store = configureStore({
  reducer: {
    pdf: pdfSlice.reducer,
    drawing: drawingSlice.reducer,
    pageCoordinate: pageCoordinateSlice.reducer,
    layer: layerSlice.reducer,
    ui: uiSlice.reducer,
    ai: aiSlice.reducer,
    properties: propertiesSlice.reducer,
    loads: loadsSlice.reducer,
    loadAssignments: loadAssignmentsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredPaths: ['pdf.document'],
        ignoredActions: ['pdf/setDocument'],
      },
    }).concat(undoableMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

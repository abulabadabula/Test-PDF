// src/app/store/slices/drawingSlice.ts

import { createAction, createSlice, Middleware, nanoid, PayloadAction, UnknownAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { StructuralElement, StructuralElementType } from '@/features/drawing/elements/elementTypes';

export type ToolType =
  | 'select' | 'column' | 'beam' | 'wall' | 'slab' | 'portalFrame' | 'rectSlab'
  | 'point' | 'line' | 'polyline' | 'polygon' | 'rectangle' | 'circle'
  | 'text' | 'measure' | 'eraser';

interface BaseShape {
  id: string;
  type: Exclude<ToolType, StructuralElementType | 'select' | 'eraser'>;
  layerId: string;
  pageIndex: number;
  color: string;
  strokeWidth: number;
  opacity: number;
  zIndex?: number;
  fillColor?: string;
  fillOpacity?: number;
  label?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface PointShape extends BaseShape {
  type: 'point';
  x: number;
  y: number;
  radius: number;
}

export interface LineShape extends BaseShape {
  type: 'line';
  points: [number, number, number, number];
}

export interface PolylineShape extends BaseShape {
  type: 'polyline';
  points: number[];
}

export interface PolygonShape extends BaseShape {
  type: 'polygon';
  points: number[];
}

export interface RectShape extends BaseShape {
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CircleShape extends BaseShape {
  type: 'circle';
  x: number;
  y: number;
  radius: number;
}

export interface TextShape extends BaseShape {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily: string;
}

export interface MeasureShape extends BaseShape {
  type: 'measure';
  points: number[];
  realLength: number;
  unit: string;
  scaleRatio: string;
}

export type LegacyShape =
  | PointShape
  | LineShape
  | PolylineShape
  | PolygonShape
  | RectShape
  | CircleShape
  | TextShape
  | MeasureShape;

export type Shape = LegacyShape | StructuralElement;

export interface DrawingState {
  activeTool: ToolType;
  shapes: Shape[];
  selectedShapeIds: string[];
  currentStrokeColor: string;
  currentFillColor: string;
  currentStrokeWidth: number;
  currentFontSize: number;
  currentOpacity: number;
  scaleNumerator: number;
  scaleDenominator: number;
  scaleUnit: string;
  undoStack: Shape[][];
  redoStack: Shape[][];
  clipboard: Shape[];
  historyTransaction: 'idle' | 'active';
}

const initialState: DrawingState = {
  activeTool: 'select',
  shapes: [],
  selectedShapeIds: [],
  currentStrokeColor: '#2563eb',
  currentFillColor: 'transparent',
  currentStrokeWidth: 2,
  currentFontSize: 16,
  currentOpacity: 1,
  scaleNumerator: 1,
  scaleDenominator: 100,
  scaleUnit: 'mm',
  undoStack: [],
  redoStack: [],
  clipboard: [],
  historyTransaction: 'idle',
};

export const beginHistoryTransaction = createAction('drawing/beginHistoryTransaction');
export const endHistoryTransaction = createAction('drawing/endHistoryTransaction');
export const exportShapes = createAction('drawing/exportShapes');

// Rescale structural shapes based on a scaling factor
function rescaleStructuralShapes(shapes: Shape[], factor: number) {
  if (!Number.isFinite(factor) || factor <= 0 || factor === 1) return;

  for (const shape of shapes) {
    if (!('geometry' in shape)) continue;

    const g = (shape as StructuralElement).geometry as any;

    switch (shape.type) {
      case 'column': {
        const cx = g.x + g.width / 2;
        const cy = g.y + g.depth / 2;
        const w = g.width * factor;
        const d = g.depth * factor;

        g.width = w;
        g.depth = d;
        g.x = cx - w / 2;
        g.y = cy - d / 2;
        break;
      }

      case 'beam':
      case 'wall':
      case 'portalFrame': {
        if (!g.start || !g.end) break;

        const cx = (g.start.x + g.end.x) / 2;
        const cy = (g.start.y + g.end.y) / 2;

        g.start = {
          x: cx + (g.start.x - cx) * factor,
          y: cy + (g.start.y - cy) * factor,
        };

        g.end = {
          x: cx + (g.end.x - cx) * factor,
          y: cy + (g.end.y - cy) * factor,
        };

        if (shape.type === 'beam') {
          g.width *= factor;
          g.depth *= factor;
        } else if (shape.type === 'wall') {
          g.thickness *= factor;
        } else {
          g.height *= factor;
          g.columnWidth *= factor;
          g.columnDepth *= factor;
          g.beamWidth *= factor;
          g.beamDepth *= factor;
        }

        break;
      }

      case 'slab': {
        const pts = g.points as Array<{ x: number; y: number }>;
        if (!pts?.length) break;

        const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
        const cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;

        g.points = pts.map((p) => ({
          x: cx + (p.x - cx) * factor,
          y: cy + (p.y - cy) * factor,
        }));

        break;
      }
    }
  }
}

export const drawingSlice = createSlice({
  name: 'drawing',
  initialState,
  reducers: {
    setActiveTool: (s, a: PayloadAction<ToolType>) => {
      s.activeTool = a.payload;
      if (a.payload !== 'select') s.selectedShapeIds = [];
    },

    addShape: (s, a: PayloadAction<Omit<Shape, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }>) => {
      const now = new Date().toISOString();
      const shape = {
        ...a.payload,
        id: a.payload.id ?? nanoid(), // 优先使用传入的 id，否则自动生成
        createdAt: now,
        updatedAt: now,
      } as Shape;
      s.shapes.push(shape);
      s.selectedShapeIds = [shape.id];
    },

    updateShape: (s, a: PayloadAction<{ id: string; changes: Partial<Shape> }>) => {
      const shape = s.shapes.find((x) => x.id === a.payload.id);
      if (shape) {
        Object.assign(shape, a.payload.changes, {
          updatedAt: new Date().toISOString(),
        });
      }
    },

    deleteShape: (s, a: PayloadAction<string>) => {
      s.shapes = s.shapes.filter((x) => x.id !== a.payload);
      s.selectedShapeIds = s.selectedShapeIds.filter((id) => id !== a.payload);
    },

    selectShape: (s, a: PayloadAction<{ id: string; multiSelect?: boolean }>) => {
      if (a.payload.multiSelect) {
        s.selectedShapeIds = s.selectedShapeIds.includes(a.payload.id)
          ? s.selectedShapeIds.filter((id) => id !== a.payload.id)
          : [...s.selectedShapeIds, a.payload.id];
      } else {
        s.selectedShapeIds = [a.payload.id];
      }
    },

    selectShapes: (s, a: PayloadAction<string[]>) => {
      s.selectedShapeIds = [...a.payload];
    },

    clearSelection: (s) => {
      s.selectedShapeIds = [];
    },

    deleteSelected: (s) => {
      const ids = new Set(s.selectedShapeIds);
      s.shapes = s.shapes.filter((x) => !ids.has(x.id));
      s.selectedShapeIds = [];
    },

    copySelected: (s) => {
      s.clipboard = s.shapes
        .filter((x) => s.selectedShapeIds.includes(x.id))
        .map((x) => JSON.parse(JSON.stringify(x)));
    },

    pasteClipboard: (s) => {
      if (!s.clipboard.length) return;

      const now = new Date().toISOString();

      const pasted = s.clipboard.map((x) => {
        const copy = JSON.parse(JSON.stringify(x));

        copy.id = nanoid();
        copy.createdAt = now;
        copy.updatedAt = now;

        if ('geometry' in copy) {
          const prefix =
            copy.type === 'portalFrame'
              ? 'PF'
              : copy.type === 'column'
                ? 'C'
                : copy.type === 'beam'
                  ? 'B'
                  : 'W';

          const used = s.shapes
            .filter((v: any) => v.type === copy.type)
            .map((v: any) => v.label);

          let n = 1;
          while (used.includes(`${prefix}-${String(n).padStart(3, '0')}`)) n++;

          copy.label = `${prefix}-${String(n).padStart(3, '0')}`;
          copy.properties.label = copy.label;

          const g = copy.geometry;

          if (copy.type === 'column') {
            g.x += 200;
            g.y += 200;
          } else if (copy.type === 'slab') {
            g.points = g.points.map((p: any) => ({
              x: p.x + 200,
              y: p.y + 200,
            }));
          } else {
            g.start = {
              x: g.start.x + 200,
              y: g.start.y + 200,
            };
            g.end = {
              x: g.end.x + 200,
              y: g.end.y + 200,
            };
          }
        } else if ('x' in copy) {
          copy.x += 200;
          copy.y += 200;
        } else if ('points' in copy) {
          for (let i = 0; i < copy.points.length; i += 2) {
            copy.points[i] += 200;
            copy.points[i + 1] += 200;
          }
        }

        return copy;
      });

      s.shapes.push(...pasted);
      s.selectedShapeIds = pasted.map((x: any) => x.id);
      s.clipboard = pasted.map((x: any) => JSON.parse(JSON.stringify(x)));
    },

    setStrokeColor: (s, a: PayloadAction<string>) => {
      s.currentStrokeColor = a.payload;
    },

    setFillColor: (s, a: PayloadAction<string>) => {
      s.currentFillColor = a.payload;
    },

    setStrokeWidth: (s, a: PayloadAction<number>) => {
      s.currentStrokeWidth = a.payload;
    },

    setFontSize: (s, a: PayloadAction<number>) => {
      s.currentFontSize = a.payload;
    },

    setOpacity: (s, a: PayloadAction<number>) => {
      s.currentOpacity = a.payload;
    },

    setScaleRatio: (
      s,
      a: PayloadAction<{
        num: number;
        den: number;
        unit: string;
      }>,
    ) => {
      /*
      * IMPORTANT:
      *
      * Changing drawing scale must NEVER
      * modify existing PDF page geometry.
      *
      * Existing shapes are already located
      * on the PDF page.
      *
      * Drawing scale only changes how page
      * coordinates are interpreted as engineering
      * dimensions.
      */
      if (
        !Number.isFinite(a.payload.num) ||
        !Number.isFinite(a.payload.den) ||
        a.payload.num <= 0 ||
        a.payload.den <= 0
      ) {
        return;
      }

      s.scaleNumerator =
        a.payload.num;

      s.scaleDenominator =
        a.payload.den;

      s.scaleUnit =
        a.payload.unit;
    },

    _pushUndo: (s, a: PayloadAction<Shape[]>) => {
      s.undoStack.push(JSON.parse(JSON.stringify(a.payload)));
      s.redoStack = [];

      if (s.undoStack.length > 50) s.undoStack.shift();
    },

    undo: (s) => {
      const previous = s.undoStack.pop();

      if (previous) {
        s.redoStack.push(JSON.parse(JSON.stringify(s.shapes)));
        s.shapes = previous;
        s.selectedShapeIds = [];
      }
    },

    redo: (s) => {
      const next = s.redoStack.pop();

      if (next) {
        s.undoStack.push(JSON.parse(JSON.stringify(s.shapes)));
        s.shapes = next;
        s.selectedShapeIds = [];
      }
    },

    importShapes: (s, a: PayloadAction<Shape[]>) => {
      s.shapes.push(...a.payload);
    },

    _setHistoryState: (s, a: PayloadAction<'idle' | 'active'>) => {
      s.historyTransaction = a.payload;
    },
  },
});

export const undoableMiddleware: Middleware = (storeAPI) => (next) => (action) => {
  if (typeof action !== 'object' || action === null || !('type' in action)) {
    return next(action);
  }

  const a = action as UnknownAction;

  if (a.type === beginHistoryTransaction.type) {
    const state = storeAPI.getState() as RootState;

    if (state.drawing.historyTransaction === 'idle') {
      (storeAPI.dispatch as typeof storeAPI.dispatch)(
        drawingSlice.actions._setHistoryState('active')
      );
      transactionBefore = JSON.parse(JSON.stringify(state.drawing.shapes));
    }

    return next(a);
  }

  if (a.type === endHistoryTransaction.type) {
    const result = next(a);

    if (transactionBefore) {
      const state = storeAPI.getState() as RootState;

      if (JSON.stringify(transactionBefore) !== JSON.stringify(state.drawing.shapes)) {
        storeAPI.dispatch(drawingSlice.actions._pushUndo(transactionBefore));
      }

      transactionBefore = null;
      storeAPI.dispatch(drawingSlice.actions._setHistoryState('idle'));
    }

    return result;
  }

  if (
    a.type === 'drawing/undo' ||
    a.type === 'drawing/redo' ||
    a.type === beginHistoryTransaction.type ||
    a.type === endHistoryTransaction.type ||
    a.type === 'drawing/_pushUndo' ||
    a.type === 'drawing/_setHistoryState'
  ) {
    return next(a);
  }

  if (isHistoryAction(a)) {
    const state = storeAPI.getState() as RootState;

    if (state.drawing.historyTransaction === 'idle') {
      const before = JSON.parse(JSON.stringify(state.drawing.shapes));
      const result = next(a);

      if (
        JSON.stringify(before) !==
        JSON.stringify((storeAPI.getState() as RootState).drawing.shapes)
      ) {
        storeAPI.dispatch(drawingSlice.actions._pushUndo(before));
      }

      return result;
    }
  }

  return next(a);
};

let transactionBefore: Shape[] | null = null;

function isHistoryAction(a: UnknownAction) {
  const historyTypes: string[] = [
    drawingSlice.actions.addShape.type,
    drawingSlice.actions.updateShape.type,
    drawingSlice.actions.deleteShape.type,
    drawingSlice.actions.deleteSelected.type,
    drawingSlice.actions.pasteClipboard.type,
    drawingSlice.actions.importShapes.type,
  ];

  return historyTypes.includes(a.type as string);
}

export const {
  setActiveTool,
  addShape,
  updateShape,
  deleteShape,
  selectShape,
  selectShapes,
  clearSelection,
  deleteSelected,
  copySelected,
  pasteClipboard,
  setStrokeColor,
  setFillColor,
  setStrokeWidth,
  setFontSize,
  setOpacity,
  setScaleRatio,
  _pushUndo,
  undo,
  redo,
  importShapes,
  _setHistoryState,
} = drawingSlice.actions;

export const selectActiveTool = (s: RootState) => s.drawing.activeTool;
export const selectAllShapes = (s: RootState) => s.drawing.shapes;
export const selectSelectedShapeIds = (s: RootState) => s.drawing.selectedShapeIds;

export const selectShapesByPage = (s: RootState, pageIndex: number) =>
  s.drawing.shapes.filter((x) => x.pageIndex === pageIndex);

export const selectShapesByLayer = (s: RootState, layerId: string) =>
  s.drawing.shapes.filter((x) => x.layerId === layerId);

export const selectSelectedShapes = (s: RootState) =>
  s.drawing.shapes.filter((x) => s.drawing.selectedShapeIds.includes(x.id));

export const selectCanUndo = (s: RootState) => s.drawing.undoStack.length > 0;
export const selectCanRedo = (s: RootState) => s.drawing.redoStack.length > 0;

export const selectCurrentDrawingScale = (
  s: RootState,
) => ({
  numerator:
    s.drawing.scaleNumerator,

  denominator:
    s.drawing.scaleDenominator,

  unit:
    s.drawing.scaleUnit,
});

export default drawingSlice;
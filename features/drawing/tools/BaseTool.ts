// src/features/drawing/tools/BaseTool.ts

import type { AppDispatch, RootState } from '@/app/store';
import type { Shape } from '@/app/store/slices/drawingSlice';

export interface CanvasEvent {
  x: number;
  y: number;
  rawEvent: React.MouseEvent | MouseEvent;
}

export interface ToolContext {
  dispatch: AppDispatch;
  getState: () => RootState;
  pdfScale: number;

  tempShape: Shape | null;
  setTempShape: (shape: Shape | null) => void;

  hitTest: (x: number, y: number) => Shape | null;
  showTextDialog: (x: number, y: number) => void;

  addShape: (shape: Shape) => void;
  updateShape: (id: string, changes: Partial<Shape>) => void;

  selectShape: (id: string, multiSelect: boolean) => void;
  clearSelection: () => void;
  deleteSelected: () => void;

  beginHistory: () => void;
  endHistory: () => void;
}

export abstract class BaseTool {
  abstract cursor: string;

  abstract onMouseDown(
    e: CanvasEvent,
    ctx: ToolContext,
  ): void;

  abstract onMouseMove(
    e: CanvasEvent,
    ctx: ToolContext,
  ): void;

  abstract onMouseUp(
    e: CanvasEvent,
    ctx: ToolContext,
  ): void;

  onDblClick?(
    e: CanvasEvent,
    ctx: ToolContext,
  ): void;

  onKeyDown?(
    e: KeyboardEvent,
    ctx: ToolContext,
  ): void;

  /**
   * Called when the current drawing operation is cancelled,
   * for example with right-click.
   */
  onCancel?(ctx: ToolContext): void;
}
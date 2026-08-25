import { BaseTool, CanvasEvent, ToolContext } from './BaseTool';
import { distance } from '../utils/geometry';
import type { MeasureShape } from '@/app/store/slices/drawingSlice';
import {
  pagePtToEngineeringUnit,
  type EngineeringUnit,
} from '@/core/coordinate/engineeringScale';

export class MeasureTool extends BaseTool {
  cursor = 'crosshair';
  private startPoint: { x: number; y: number } | null = null;

  onMouseDown(e: CanvasEvent, ctx: ToolContext) {
    this.startPoint = { x: e.x, y: e.y };
    const state = ctx.getState();
    const drawing = state.drawing;
    const unit = (drawing.scaleUnit || 'mm') as EngineeringUnit;

    ctx.setTempShape({
      id: 'temp',
      type: 'measure',
      points: [e.x, e.y, e.x, e.y],
      realLength: 0,
      unit,
      scaleRatio: `${drawing.scaleNumerator}:${drawing.scaleDenominator}`,
      layerId: state.layer.activeLayerId,
      pageIndex: state.pdf.currentPage,
      color: drawing.currentStrokeColor,
      strokeWidth: drawing.currentStrokeWidth,
      opacity: drawing.currentOpacity,
      createdAt: '',
      updatedAt: '',
    } as MeasureShape);
  }

  onMouseMove(e: CanvasEvent, ctx: ToolContext) {
    if (!this.startPoint || !ctx.tempShape) return;

    const currentShape = ctx.tempShape as MeasureShape;
    const pts = [this.startPoint.x, this.startPoint.y, e.x, e.y];
    const pageLength = distance(pts[0], pts[1], pts[2], pts[3]);
    const drawing = ctx.getState().drawing;
    const unit = (drawing.scaleUnit || 'mm') as EngineeringUnit;
    const realLength = pagePtToEngineeringUnit(
      pageLength,
      drawing.scaleNumerator,
      drawing.scaleDenominator,
      unit,
    );

    ctx.setTempShape({
      ...currentShape,
      points: pts,
      realLength: Number(realLength.toFixed(unit === 'm' ? 3 : unit === 'cm' ? 2 : 1)),
      unit,
      scaleRatio: `${drawing.scaleNumerator}:${drawing.scaleDenominator}`,
    } as MeasureShape);
  }

  onMouseUp(e: CanvasEvent, ctx: ToolContext) {
    if (ctx.tempShape) {
      this.onMouseMove(e, ctx);
      ctx.addShape(ctx.tempShape);
      ctx.setTempShape(null);
    }
    this.startPoint = null;
  }

  onKeyDown(e: KeyboardEvent, ctx: ToolContext) {
    if (e.key === 'Escape') {
      this.startPoint = null;
      ctx.setTempShape(null);
    }
  }
}

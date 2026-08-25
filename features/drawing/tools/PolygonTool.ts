import { BaseTool, CanvasEvent, ToolContext } from './BaseTool';
import type { PolygonShape } from '@/app/store/slices/drawingSlice';

export class PolygonTool extends BaseTool {
  cursor = 'crosshair';

  onMouseDown(e: CanvasEvent, ctx: ToolContext) {
    const rootState = ctx.getState();
    const activeLayerId = rootState.layer.activeLayerId;
    const drawingState = rootState.drawing;

    if (!ctx.tempShape) {
      ctx.setTempShape({
        id: 'temp', 
        type: 'polygon', 
        points: [e.x, e.y, e.x, e.y],
        layerId: activeLayerId, 
        pageIndex: rootState.pdf.currentPage,
        color: drawingState.currentStrokeColor, 
        fillColor: drawingState.currentFillColor,
        strokeWidth: drawingState.currentStrokeWidth, 
        opacity: drawingState.currentOpacity,
        createdAt: '', 
        updatedAt: ''
      } as PolygonShape);
    } else {
      const currentShape = ctx.tempShape as PolygonShape;
      const pts = [...currentShape.points];
      pts[pts.length - 2] = e.x;
      pts[pts.length - 1] = e.y;
      pts.push(e.x, e.y);
      ctx.setTempShape({ ...currentShape, points: pts } as PolygonShape);
    }
  }

  onMouseMove(e: CanvasEvent, ctx: ToolContext) {
    if (ctx.tempShape) {
      const currentShape = ctx.tempShape as PolygonShape;
      const pts = [...currentShape.points];
      pts[pts.length - 2] = e.x;
      pts[pts.length - 1] = e.y;
      ctx.setTempShape({ ...currentShape, points: pts } as PolygonShape);
    }
  }

  onMouseUp() {}

  onDblClick(e: CanvasEvent, ctx: ToolContext) {
    this.finish(ctx);
  }

  onKeyDown(e: KeyboardEvent, ctx: ToolContext) {
    if (e.key === 'Enter') this.finish(ctx);
    if (e.key === 'Escape') ctx.setTempShape(null);
  }

  private finish(ctx: ToolContext) {
    if (ctx.tempShape) {
      const currentShape = ctx.tempShape as PolygonShape;
      const pts = currentShape.points.slice(0, -2); 
      if (pts.length >= 6) { // 多边形至少需要3个点（6个坐标值）
        ctx.addShape({ ...currentShape, points: pts } as PolygonShape);
      }
      ctx.setTempShape(null);
    }
  }
}
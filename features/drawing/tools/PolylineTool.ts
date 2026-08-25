import { BaseTool, CanvasEvent, ToolContext } from './BaseTool';
import type { PolylineShape } from '@/app/store/slices/drawingSlice';

export class PolylineTool extends BaseTool {
  cursor = 'crosshair';

  onMouseDown(e: CanvasEvent, ctx: ToolContext) {
    const rootState = ctx.getState();
    const activeLayerId = rootState.layer.activeLayerId;
    const drawingState = rootState.drawing;

    if (!ctx.tempShape) {
      ctx.setTempShape({
        id: 'temp', 
        type: 'polyline', 
        points: [e.x, e.y, e.x, e.y],
        layerId: activeLayerId, 
        pageIndex: rootState.pdf.currentPage,
        color: drawingState.currentStrokeColor, 
        strokeWidth: drawingState.currentStrokeWidth, 
        opacity: drawingState.currentOpacity,
        createdAt: '', 
        updatedAt: ''
      } as PolylineShape); // 断言为 PolylineShape
    } else {
      // 【修复】：断言 tempShape 为 PolylineShape 以安全访问 points
      const currentShape = ctx.tempShape as PolylineShape;
      const pts = [...currentShape.points];
      pts[pts.length - 2] = e.x;
      pts[pts.length - 1] = e.y;
      pts.push(e.x, e.y);
      ctx.setTempShape({ ...currentShape, points: pts } as PolylineShape);
    }
  }

  onMouseMove(e: CanvasEvent, ctx: ToolContext) {
    if (ctx.tempShape) {
      // 【修复】：断言 tempShape 为 PolylineShape
      const currentShape = ctx.tempShape as PolylineShape;
      const pts = [...currentShape.points];
      pts[pts.length - 2] = e.x;
      pts[pts.length - 1] = e.y;
      ctx.setTempShape({ ...currentShape, points: pts } as PolylineShape);
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
      const currentShape = ctx.tempShape as PolylineShape;
      const pts = currentShape.points.slice(0, -2); // 移除最后的预览点
      if (pts.length >= 4) { // 至少需要2个点（4个坐标值）
        ctx.addShape({ ...currentShape, points: pts } as PolylineShape);
      }
      ctx.setTempShape(null);
    }
  }
}
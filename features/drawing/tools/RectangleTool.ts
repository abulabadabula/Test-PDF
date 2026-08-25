import { BaseTool, CanvasEvent, ToolContext } from './BaseTool';
import type { RectShape } from '@/app/store/slices/drawingSlice';

export class RectangleTool extends BaseTool {
  cursor = 'crosshair';
  private startPoint: { x: number; y: number } | null = null;

  onMouseDown(e: CanvasEvent, ctx: ToolContext) {
    this.startPoint = { x: e.x, y: e.y };
    
    // 【修复 1】：正确获取 activeLayerId
    const rootState = ctx.getState();
    const activeLayerId = rootState.layer.activeLayerId;
    const drawingState = rootState.drawing;

    // 【修复 2】：添加 as RectShape 类型断言
    ctx.setTempShape({
      id: 'temp', 
      type: 'rectangle', 
      x: e.x, 
      y: e.y, 
      width: 0, 
      height: 0,
      layerId: activeLayerId, 
      pageIndex: rootState.pdf.currentPage,
      color: drawingState.currentStrokeColor, 
      fillColor: drawingState.currentFillColor,
      strokeWidth: drawingState.currentStrokeWidth, 
      opacity: drawingState.currentOpacity,
      createdAt: '', 
      updatedAt: ''
    } as RectShape);
  }

  onMouseMove(e: CanvasEvent, ctx: ToolContext) {
    if (this.startPoint && ctx.tempShape) {
      // 计算左上角坐标和宽高，支持反向拖拽
      const x = Math.min(this.startPoint.x, e.x);
      const y = Math.min(this.startPoint.y, e.y);
      const w = Math.abs(e.x - this.startPoint.x);
      const h = Math.abs(e.y - this.startPoint.y);
      
      // 【修复 2】：添加 as RectShape 类型断言
      ctx.setTempShape({ 
        ...ctx.tempShape, 
        x, 
        y, 
        width: w, 
        height: h 
      } as RectShape);
    }
  }

  onMouseUp(e: CanvasEvent, ctx: ToolContext) {
    if (ctx.tempShape) {
      ctx.addShape(ctx.tempShape);
      ctx.setTempShape(null);
    }
    this.startPoint = null;
  }
}
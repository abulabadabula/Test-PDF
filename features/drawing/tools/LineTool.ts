import { BaseTool, CanvasEvent, ToolContext } from './BaseTool';
import type { LineShape } from '@/app/store/slices/drawingSlice';

export class LineTool extends BaseTool {
  cursor = 'crosshair';
  private startPoint: { x: number; y: number } | null = null;

  onMouseDown(e: CanvasEvent, ctx: ToolContext) {
    this.startPoint = { x: e.x, y: e.y };
    
    // 【修复 1】：正确获取 activeLayerId
    const rootState = ctx.getState();
    const activeLayerId = rootState.layer.activeLayerId;
    const drawingState = rootState.drawing;

    // 【修复 2】：添加 as LineShape 类型断言
    ctx.setTempShape({
      id: 'temp', 
      type: 'line', 
      points: [e.x, e.y, e.x, e.y],
      layerId: activeLayerId, 
      pageIndex: rootState.pdf.currentPage,
      color: drawingState.currentStrokeColor, 
      strokeWidth: drawingState.currentStrokeWidth, 
      opacity: drawingState.currentOpacity,
      createdAt: '', 
      updatedAt: ''
    } as LineShape);
  }

  onMouseMove(e: CanvasEvent, ctx: ToolContext) {
    if (this.startPoint && ctx.tempShape) {
      // 【修复 2】：添加 as LineShape 类型断言
      ctx.setTempShape({ 
        ...ctx.tempShape, 
        points: [this.startPoint.x, this.startPoint.y, e.x, e.y] 
      } as LineShape);
    }
  }

  onMouseUp(e: CanvasEvent, ctx: ToolContext) {
    if (this.startPoint && ctx.tempShape) {
      ctx.addShape(ctx.tempShape);
      ctx.setTempShape(null);
    }
    this.startPoint = null;
  }
}
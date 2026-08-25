import { BaseTool, CanvasEvent, ToolContext } from './BaseTool';
import { distance } from '../utils/geometry';
import type { CircleShape } from '@/app/store/slices/drawingSlice';

export class CircleTool extends BaseTool {
  cursor = 'crosshair';
  private center: { x: number; y: number } | null = null;

  onMouseDown(e: CanvasEvent, ctx: ToolContext) {
    this.center = { x: e.x, y: e.y };
    
    // 【修复 1】：从 rootState 中分别获取 layer 和 drawing 状态
    const rootState = ctx.getState();
    const activeLayerId = rootState.layer.activeLayerId; 
    const drawingState = rootState.drawing;

    // 【修复 2】：添加 as CircleShape 类型断言
    ctx.setTempShape({
      id: 'temp', 
      type: 'circle', 
      x: e.x, 
      y: e.y, 
      radius: 0,
      layerId: activeLayerId, 
      pageIndex: rootState.pdf.currentPage,
      color: drawingState.currentStrokeColor, 
      fillColor: drawingState.currentFillColor,
      strokeWidth: drawingState.currentStrokeWidth, 
      opacity: drawingState.currentOpacity,
      createdAt: '', 
      updatedAt: ''
    } as CircleShape);
  }

  onMouseMove(e: CanvasEvent, ctx: ToolContext) {
    if (this.center && ctx.tempShape) {
      const r = distance(this.center.x, this.center.y, e.x, e.y);
      // 【修复 2】：展开联合类型时，必须断言为当前具体的 Shape 类型
      ctx.setTempShape({ ...ctx.tempShape, radius: r } as CircleShape);
    }
  }

  onMouseUp(e: CanvasEvent, ctx: ToolContext) {
    if (ctx.tempShape) {
      ctx.addShape(ctx.tempShape);
      ctx.setTempShape(null);
    }
    this.center = null;
  }
}
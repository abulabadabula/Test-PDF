import { BaseTool, CanvasEvent, ToolContext } from './BaseTool';
import type { PointShape } from '@/app/store/slices/drawingSlice';

export class PointTool extends BaseTool {
  cursor = 'crosshair';
  
  onMouseDown(e: CanvasEvent, ctx: ToolContext) {
    const rootState = ctx.getState();
    const activeLayerId = rootState.layer.activeLayerId;
    const drawingState = rootState.drawing;

    // 【修复】：添加 as PointShape 断言，并确保 activeLayerId 来源正确
    ctx.addShape({
      type: 'point', 
      x: e.x, 
      y: e.y, 
      radius: 5,
      layerId: activeLayerId, 
      pageIndex: rootState.pdf.currentPage,
      color: drawingState.currentStrokeColor, 
      strokeWidth: drawingState.currentStrokeWidth, 
      opacity: drawingState.currentOpacity
    } as PointShape);
  }
  
  onMouseMove() {}
  onMouseUp() {}
}
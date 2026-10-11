import { BaseTool, CanvasEvent, ToolContext } from './BaseTool';
import type { PointShape } from '@/app/store/slices/drawingSlice';

export class PointTool extends BaseTool {
  cursor = 'crosshair';
  
  onMouseDown(e: CanvasEvent, ctx: ToolContext) {
    const rootState = ctx.getState();
    const drawingState = rootState.drawing;

    ctx.addShape({
      type: 'point', 
      x: e.x, 
      y: e.y, 
      radius: 5,
      pageIndex: rootState.pdf.currentPage,
      color: drawingState.currentStrokeColor, 
      strokeWidth: drawingState.currentStrokeWidth, 
      opacity: drawingState.currentOpacity
    } as PointShape);
  }
  
  onMouseMove() {}
  onMouseUp() {}
}
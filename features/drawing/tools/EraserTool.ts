import { BaseTool, CanvasEvent, ToolContext } from './BaseTool';

export class EraserTool extends BaseTool {
  cursor = 'not-allowed';
  onMouseDown(e: CanvasEvent, ctx: ToolContext) {
    const shape = ctx.hitTest(e.x, e.y);
    if (shape) ctx.dispatch({ type: 'drawing/deleteShape', payload: shape.id });
  }
  onMouseMove(e: CanvasEvent, ctx: ToolContext) {
    if (e.rawEvent.buttons === 1) { // 左键按下拖动
      const shape = ctx.hitTest(e.x, e.y);
      if (shape) ctx.dispatch({ type: 'drawing/deleteShape', payload: shape.id });
    }
  }
  onMouseUp() {}
}
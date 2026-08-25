import { BaseTool, CanvasEvent, ToolContext } from './BaseTool';

export class TextTool extends BaseTool {
  cursor = 'text';
  onMouseDown(e: CanvasEvent, ctx: ToolContext) {
    ctx.showTextDialog(e.x, e.y);
  }
  onMouseMove() {}
  onMouseUp() {}
}
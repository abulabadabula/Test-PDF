import { BaseTool, CanvasEvent, ToolContext } from './BaseTool';
import { getStructuralDefaults } from '../elements/elementDefaults';
import { makeBase, ensureLabel, getOrCreateNode } from './structuralToolUtils';

export class RectSlabTool extends BaseTool {
  cursor = 'crosshair';
  private startPoint: { x: number; y: number } | null = null;

  onMouseDown(e: CanvasEvent, ctx: ToolContext) {
    if (this.startPoint) return;
    this.startPoint = { x: e.x, y: e.y };
    
    const drawing = ctx.getState().drawing;
    const d = getStructuralDefaults(drawing.scaleDenominator, drawing.scaleNumerator).slab;
    const label = ensureLabel(ctx, 'slab');

    ctx.setTempShape({
      ...makeBase(ctx, 'slab', { points: [{ x: e.x, y: e.y }] }),
      label,
      properties: { 
        label, 
        thickness: d.realThickness, 
        material: d.material, 
        level: d.level 
      },
    } as any);
  }

  onMouseMove(e: CanvasEvent, ctx: ToolContext) {
    if (this.startPoint && ctx.tempShape) {
      const pts = [
        { x: this.startPoint.x, y: this.startPoint.y },
        { x: e.x, y: this.startPoint.y },
        { x: e.x, y: e.y },
        { x: this.startPoint.x, y: e.y },
      ];
      ctx.setTempShape({ ...ctx.tempShape, geometry: { points: pts } } as any);
    }
  }

  onMouseUp(e: CanvasEvent, ctx: ToolContext) {
    if (this.startPoint && ctx.tempShape) {
      const shape: any = ctx.tempShape;
      const pts = [
        { x: this.startPoint.x, y: this.startPoint.y },
        { x: e.x, y: this.startPoint.y },
        { x: e.x, y: e.y },
        { x: this.startPoint.x, y: e.y },
      ];
      
      const nodeIds: string[] = [];
      
      // 为矩形的 4 个顶点解析或创建 Node
      pts.forEach((p) => {
        const nodeResult = getOrCreateNode(ctx, p, 2);
        if (nodeResult.isNew && nodeResult.shape) {
          ctx.addShape(nodeResult.shape);
        }
        nodeIds.push(nodeResult.id);
      });

      // 添加最终的 Slab
      ctx.addShape({
        ...shape,
        geometry: { points: pts },
        properties: { 
          ...shape.properties, 
          nodeIds 
        },
      } as any);
      
      ctx.setTempShape(null);
      this.startPoint = null;
    }
  }

  onKeyDown(e: KeyboardEvent, ctx: ToolContext) {
    if (e.key === 'Escape') {
      this.startPoint = null;
      ctx.setTempShape(null);
    }
  }
}
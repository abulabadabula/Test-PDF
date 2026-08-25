import { BaseTool, CanvasEvent, ToolContext } from './BaseTool';
import { makeBase, ensureLabel, getOrCreateNode } from './structuralToolUtils';
import { getStructuralDefaults } from '../elements/elementDefaults';

export class ColumnTool extends BaseTool {
  cursor = 'crosshair';

  onMouseDown(e: CanvasEvent, ctx: ToolContext) {
    const scale = ctx.getState().drawing.scaleDenominator;
    const d = getStructuralDefaults(scale, ctx.getState().drawing.scaleNumerator).column;
    const label = ensureLabel(ctx, 'column');

    // 在柱子中心创建或获取节点
    const center = { x: e.x, y: e.y };
    const nodeResult = getOrCreateNode(ctx, center, 2);
    if (nodeResult.isNew && nodeResult.shape) {
      ctx.addShape(nodeResult.shape);
    }

    ctx.addShape({
      ...makeBase(ctx, 'column', {
        x: e.x - d.width / 2,
        y: e.y - d.depth / 2,
        width: d.width,
        depth: d.depth,
        rotation: d.rotation,
      }),
      label,
      properties: {
        label,
        section: `${d.realWidth}×${d.realDepth}`,
        material: d.material,
        nodeId: nodeResult.id, // 记录节点 ID
      },
    } as any);
  }

  onMouseMove() {}
  onMouseUp() {}
}
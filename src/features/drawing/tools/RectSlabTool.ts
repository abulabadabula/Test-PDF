// import { BaseTool, CanvasEvent, ToolContext } from './BaseTool';
// import { getStructuralDefaults } from '../elements/elementDefaults';
// import { makeBase, ensureLabel, getOrCreateNode } from './structuralToolUtils';

// export class RectSlabTool extends BaseTool {
//   cursor = 'crosshair';
//   private startPoint: { x: number; y: number } | null = null;

//   onMouseDown(e: CanvasEvent, ctx: ToolContext) {
//     if (this.startPoint) return;
//     this.startPoint = { x: e.x, y: e.y };
    
//     const drawing = ctx.getState().drawing;
//     const d = getStructuralDefaults(drawing.scaleDenominator, drawing.scaleNumerator).slab;
//     const label = ensureLabel(ctx, 'slab');

//     ctx.setTempShape({
//       ...makeBase(ctx, 'slab', { points: [{ x: e.x, y: e.y }] }),
//       label,
//       properties: { 
//         label, 
//         thickness: d.realThickness, 
//         material: d.material, 
//         level: d.level 
//       },
//     } as any);
//   }

//   onMouseMove(e: CanvasEvent, ctx: ToolContext) {
//     if (this.startPoint && ctx.tempShape) {
//       const pts = [
//         { x: this.startPoint.x, y: this.startPoint.y },
//         { x: e.x, y: this.startPoint.y },
//         { x: e.x, y: e.y },
//         { x: this.startPoint.x, y: e.y },
//       ];
//       ctx.setTempShape({ ...ctx.tempShape, geometry: { points: pts } } as any);
//     }
//   }

//   onMouseUp(e: CanvasEvent, ctx: ToolContext) {
//     if (this.startPoint && ctx.tempShape) {
//       const shape: any = ctx.tempShape;
//       const pts = [
//         { x: this.startPoint.x, y: this.startPoint.y },
//         { x: e.x, y: this.startPoint.y },
//         { x: e.x, y: e.y },
//         { x: this.startPoint.x, y: e.y },
//       ];
      
//       const nodeIds: string[] = [];
      
//       // 为矩形的 4 个顶点解析或创建 Node
//       pts.forEach((p) => {
//         const nodeResult = getOrCreateNode(ctx, p, 2);
//         if (nodeResult.isNew && nodeResult.shape) {
//           ctx.addShape(nodeResult.shape);
//         }
//         nodeIds.push(nodeResult.id);
//       });

//       // 添加最终的 Slab
//       ctx.addShape({
//         ...shape,
//         geometry: { points: pts },
//         properties: { 
//           ...shape.properties, 
//           nodeIds 
//         },
//       } as any);
      
//       ctx.setTempShape(null);
//       this.startPoint = null;
//     }
//   }

//   onKeyDown(e: KeyboardEvent, ctx: ToolContext) {
//     if (e.key === 'Escape') {
//       this.startPoint = null;
//       ctx.setTempShape(null);
//     }
//   }
// }


import { BaseTool, CanvasEvent, ToolContext } from './BaseTool';
import { getStructuralDefaults } from '../elements/elementDefaults';
import { makeBase, ensureLabel, getOrCreateNode } from './structuralToolUtils';
import { deleteShape } from '@/app/store/slices/drawingSlice';

/**
 * Rectangle slab tool.
 *
 * Interaction:
 *
 * 1. First click:
 *    - resolve/reuse/create Node 1 immediately
 *    - start the rectangle preview
 *
 * 2. Mouse move:
 *    - update the temporary rectangle continuously
 *
 * 3. Mouse up:
 *    - do nothing
 *
 * 4. Second click:
 *    - validate that both width and height are non-zero
 *    - resolve/reuse/create the four corner nodes
 *    - commit the slab
 *
 * This is intentionally click-click rather than click-drag.
 */
export class RectSlabTool extends BaseTool {
  cursor = 'crosshair';

  private startPoint: { x: number; y: number } | null = null;

  /**
   * Node IDs created during the current rectangle operation.
   *
   * Existing nodes are never stored here, so cancelling the drawing
   * operation cannot accidentally delete user geometry.
   */
  private createdNodeIds = new Set<string>();

  /** Page-coordinate tolerance. */
  private static readonly NODE_TOLERANCE = 5;

  /** Coordinates that are effectively identical should be treated as the same axis. */
  private static readonly AXIS_EPSILON = 1e-6;

  /**
   * Resolve a point to an existing node or create a new node now.
   *
   * The node is immediately inserted into Redux and rendered.
   */
  private resolveNode(point: { x: number; y: number }, ctx: ToolContext) {
    const result = getOrCreateNode(ctx, point, RectSlabTool.NODE_TOLERANCE);
    if (result.isNew && result.shape) {
      ctx.addShape(result.shape);
      this.createdNodeIds.add(result.id);
      /*
       * addShape() automatically selects the new node.
       * During drawing, nodes are topology/display objects rather
       * than selection objects, so clear that transient selection.
       */
      ctx.clearSelection();
    }
    return result;
  }

  /** Delete only nodes created by this active drawing operation. */
  private cleanupCreatedNodes(ctx: ToolContext) {
    this.createdNodeIds.forEach((id) => ctx.dispatch(deleteShape(id)));
    this.createdNodeIds.clear();
  }

  onMouseDown(e: CanvasEvent, ctx: ToolContext) {
    /*
     * ---------------------------------------------------------------
     * FIRST CLICK
     * ---------------------------------------------------------------
     */
    if (!this.startPoint) {
      const node = this.resolveNode({ x: e.x, y: e.y }, ctx);
      /*
       * Use the actual snapped/resolved node position as the rectangle
       * anchor. This keeps the slab geometry coincident with the node.
       */
      this.startPoint = { x: node.snappedPoint.x, y: node.snappedPoint.y };
      const drawing = ctx.getState().drawing;
      const defaults = getStructuralDefaults(drawing.scaleDenominator, drawing.scaleNumerator).slab;
      const label = ensureLabel(ctx, 'slab');
      ctx.setTempShape({
        ...makeBase(ctx, 'slab', {
          points: [this.startPoint, this.startPoint, this.startPoint, this.startPoint],
        }),
        label,
        properties: {
          label,
          thickness: defaults.realThickness,
          material: defaults.material,
          level: defaults.level,
        },
      } as any);
      return;
    }

    /*
     * ---------------------------------------------------------------
     * SECOND CLICK
     * ---------------------------------------------------------------
     */
    const endNode = this.resolveNode({ x: e.x, y: e.y }, ctx);
    const endPoint = endNode.snappedPoint;
    const dx = endPoint.x - this.startPoint.x;
    const dy = endPoint.y - this.startPoint.y;
    const sameX = Math.abs(dx) <= RectSlabTool.AXIS_EPSILON;
    const sameY = Math.abs(dy) <= RectSlabTool.AXIS_EPSILON;

    /*
     * Do not create a rectangle when either dimension is zero.
     *
     * The important detail is that an invalid second click must not
     * terminate the drawing operation.
     */
    if (sameX || sameY) {
      /*
       * If this click created a temporary node which is not used by
       * a finished slab, remove it immediately.
       */
      if (endNode.isNew && this.createdNodeIds.has(endNode.id)) {
        ctx.dispatch(deleteShape(endNode.id));
        this.createdNodeIds.delete(endNode.id);
      }
      return;
    }

    if (!ctx.tempShape) return;

    const points = [
      { x: this.startPoint.x, y: this.startPoint.y },
      { x: endPoint.x, y: this.startPoint.y },
      { x: endPoint.x, y: endPoint.y },
      { x: this.startPoint.x, y: endPoint.y },
    ];

    /*
     * Resolve all four corners.
     *
     * Corner 1 and the clicked corner may already have been created
     * during the drawing operation. The two remaining corners are
     * resolved now.
     */
    const nodeIds: string[] = [];
    points.forEach((point) => {
      const result = this.resolveNode(point, ctx);
      nodeIds.push(result.id);
    });

    /*
     * Use the resolved node positions for the final slab geometry.
     * This guarantees exact topological coincidence.
     */
    const resolvedPoints = points.map((point) => {
      const result = getOrCreateNode(ctx, point, RectSlabTool.NODE_TOLERANCE);
      return result.snappedPoint;
    });

    const shape = ctx.tempShape as any;

    /*
     * Only the slab is selected after finalization.
     */
    ctx.clearSelection();
    ctx.addShape({
      ...shape,
      geometry: { points: resolvedPoints },
      properties: { ...shape.properties, nodeIds },
    } as any);

    /*
     * Commit complete. These nodes now belong to the model and must
     * survive after the drawing operation ends.
     */
    this.createdNodeIds.clear();
    this.startPoint = null;
    ctx.setTempShape(null);
  }

  onMouseMove(e: CanvasEvent, ctx: ToolContext) {
    if (!this.startPoint || !ctx.tempShape) return;
    const points = [
      { x: this.startPoint.x, y: this.startPoint.y },
      { x: e.x, y: this.startPoint.y },
      { x: e.x, y: e.y },
      { x: this.startPoint.x, y: e.y },
    ];
    ctx.setTempShape({
      ...ctx.tempShape,
      geometry: { points },
    } as any);
  }

  /**
   * Mouseup intentionally does nothing.
   */
  onMouseUp() {
    // Rectangle completion is controlled by the second click.
  }

  onKeyDown(e: KeyboardEvent, ctx: ToolContext) {
    if (e.key === 'Escape') this.onCancel(ctx);
  }

  onCancel(ctx: ToolContext) {
    this.cleanupCreatedNodes(ctx);
    this.startPoint = null;
    ctx.setTempShape(null);
    ctx.clearSelection();
  }
}
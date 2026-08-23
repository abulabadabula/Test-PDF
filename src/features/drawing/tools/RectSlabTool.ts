// src/features/drawing/tools/RectSlabTool.ts

import { BaseTool, CanvasEvent, ToolContext } from './BaseTool';
import { getStructuralDefaults, ELEMENT_COLORS } from '../elements/elementDefaults';
import { makeBase, ensureLabel, getOrCreateNode } from './structuralToolUtils';
import { deleteShape } from '@/app/store/slices/drawingSlice';
import { nanoid } from 'nanoid';

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
      // 1. 先获取基础的 shape 配置
      const baseShape = makeBase(ctx, 'slab', {
        points: [this.startPoint, this.startPoint, this.startPoint, this.startPoint],
      });

      const slabStyle = {
        color: ELEMENT_COLORS.slab,
        strokeWidth: 1.5,
        opacity: 1,
        fillColor: ELEMENT_COLORS.slab,
        fillOpacity: 0.15,
      };
      // 2. 确保预览时有填充效果：如果当前全局填充色是透明，则使用默认的 slab 蓝色 (#2563eb)
      const previewFillColor = baseShape.style.fillColor === 'transparent' 
        ? '#059669' 
        : baseShape.style.fillColor;

      // 3. 显式设置 fillColor 和 fillOpacity
      ctx.setTempShape({
        ...baseShape,
        label,
        style: {
          ...slabStyle,
          fillColor: previewFillColor,
          fillOpacity: 0.15, // 设置 15% 的半透明填充，完美复刻 slabtools 的预览质感
        },
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
      id: nanoid(),
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
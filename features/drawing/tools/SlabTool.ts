// src/features/drawing/tools/SlabTool.ts

import { BaseTool, CanvasEvent, ToolContext } from './BaseTool';
import { getStructuralDefaults, ELEMENT_COLORS } from '../elements/elementDefaults';
import { makeBase, ensureLabel, getOrCreateNode } from './structuralToolUtils';
import { deleteShape } from '@/app/store/slices/drawingSlice';
import { nanoid } from 'nanoid';

/**
 * Polygon slab drawing tool.
 *
 * Each user click represents a real polygon vertex.
 * A node is resolved/created immediately at that click, so the user
 * can see the node while the polygon is still being drawn.
 *
 * The last point in tempShape is always the live mouse-preview point.
 */
export class SlabTool extends BaseTool {
  cursor = 'crosshair';

  /**
   * Nodes created during the current unfinished polygon.
   *
   * Existing nodes are never added to this set.
   */
  private createdNodeIds = new Set<string>();

  private static readonly NODE_TOLERANCE = 5;

  /**
   * Add or reuse a node immediately.
   *
   * The node is made visible as soon as its vertex is confirmed.
   */
  private resolveNode(point: { x: number; y: number }, ctx: ToolContext) {
    const result = getOrCreateNode(ctx, point, SlabTool.NODE_TOLERANCE);
    if (result.isNew && result.shape) {
      ctx.addShape(result.shape);
      this.createdNodeIds.add(result.id);
      /*
       * Prevent newly-created topology nodes from entering the
       * selection state while the slab is being drawn.
       */
      ctx.clearSelection();
    }
    return result;
  }

  /** Remove only nodes created by the unfinished polygon. */
  private cleanupCreatedNodes(ctx: ToolContext) {
    this.createdNodeIds.forEach((id) => ctx.dispatch(deleteShape(id)));
    this.createdNodeIds.clear();
  }

  onMouseDown(e: CanvasEvent, ctx: ToolContext) {
    const drawing = ctx.getState().drawing;
    const defaults = getStructuralDefaults(drawing.scaleDenominator, drawing.scaleNumerator).slab;
    const label = ensureLabel(ctx, 'slab');
    const slabStyle = {
      color: ELEMENT_COLORS.slab,
      strokeWidth: 1.5,
      opacity: 1,
      fillColor: ELEMENT_COLORS.slab,
      fillOpacity: 0.15,
    };
    const point = this.resolveNode({ x: e.x, y: e.y }, ctx);
    const snappedPoint = point.snappedPoint;

    /*
     * ---------------------------------------------------------------
     * FIRST POINT
     * ---------------------------------------------------------------
     */
    if (!ctx.tempShape) {
      ctx.setTempShape({
        id: nanoid(),
        ...makeBase(ctx, 'slab', { points: [snappedPoint, snappedPoint] }),
        label,
        style: slabStyle,
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
     * NEXT POLYGON VERTEX
     * ---------------------------------------------------------------
     */
    const currentShape = ctx.tempShape as any;
    const points = [...currentShape.geometry.points];
    /*
     * The last point is the current mouse-preview point.
     * Replace it with the confirmed vertex and append a fresh preview
     * point at the same location.
     */
    points[points.length - 1] = snappedPoint;
    points.push(snappedPoint);

    ctx.setTempShape({
      ...currentShape,
      geometry: { points },
    } as any);
  }

  onMouseMove(e: CanvasEvent, ctx: ToolContext) {
    if (!ctx.tempShape) return;
    const currentShape = ctx.tempShape as any;
    const points = [...currentShape.geometry.points];
    if (points.length === 0) return;
    points[points.length - 1] = { x: e.x, y: e.y };
    ctx.setTempShape({
      ...currentShape,
      geometry: { points },
    } as any);
  }

  onMouseUp() {
    // Polygon completion is controlled by double-click / Enter.
  }

  onDblClick(_: CanvasEvent, ctx: ToolContext) {
    this.finish(ctx);
  }

  private finish(ctx: ToolContext) {
    const shape = ctx.tempShape as any;
    if (!shape) return;

    /*
     * Remove the live mouse-preview point.
     */
    const points = shape.geometry.points.slice(0, -1);

    /*
     * Need at least three real vertices.
     */
    if (points.length < 3) {
      this.onCancel(ctx);
      return;
    }

    /*
     * Build topology from the confirmed points.
     *
     * Existing nodes are reused.
     * New nodes are committed immediately and remain part of the slab.
     */
    const nodeIds: string[] = [];
    const resolvedPoints: Array<{ x: number; y: number }> = [];
    points.forEach((point: { x: number; y: number }) => {
      const result = this.resolveNode(point, ctx);
      nodeIds.push(result.id);
      resolvedPoints.push(result.snappedPoint);
    });

    /*
     * Final selection is the slab ONLY.
     */
    ctx.clearSelection();
    ctx.addShape({
      ...shape,
      id: nanoid(),
      geometry: { points: resolvedPoints },
      properties: { ...shape.properties, nodeIds },
      style: shape.style || {
        color: ELEMENT_COLORS.slab,
        strokeWidth: 1.5,
        opacity: 1,
        fillColor: ELEMENT_COLORS.slab,
        fillOpacity: 0.15,
      },
    } as any);

    this.createdNodeIds.clear();
    ctx.setTempShape(null);
  }

  onKeyDown(e: KeyboardEvent, ctx: ToolContext) {
    if (e.key === 'Enter') {
      this.finish(ctx);
      return;
    }
    if (e.key === 'Escape') {
      this.onCancel(ctx);
    }
  }

  onCancel(ctx: ToolContext) {
    this.cleanupCreatedNodes(ctx);
    ctx.setTempShape(null);
    ctx.clearSelection();
  }
}
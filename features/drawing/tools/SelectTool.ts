import { BaseTool, CanvasEvent, ToolContext } from './BaseTool';
import { elementBounds } from '../geometry/geometryUtils';
import { translateStructuralElement } from '../geometry/transform';

const SELECTION_DRAG_THRESHOLD = 4;

/**
 * Test whether a line segment intersects a rectangle.
 */
function segmentIntersectsRect(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): boolean {
  if ((p1.x >= minX && p1.x <= maxX && p1.y >= minY && p1.y <= maxY) ||
      (p2.x >= minX && p2.x <= maxX && p2.y >= minY && p2.y <= maxY)) {
    return true;
  }

  const ccw = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) =>
    (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);

  const intersect = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }, d: { x: number; y: number }) =>
    ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);

  const topLeft = { x: minX, y: minY };
  const topRight = { x: maxX, y: minY };
  const bottomRight = { x: maxX, y: maxY };
  const bottomLeft = { x: minX, y: maxY };

  return intersect(p1, p2, topLeft, topRight) ||
         intersect(p1, p2, topRight, bottomRight) ||
         intersect(p1, p2, bottomRight, bottomLeft) ||
         intersect(p1, p2, bottomLeft, topLeft);
}

/**
 * Select tool.
 *
 * Selection rules:
 *
 * - normal click => exactly one object
 * - Shift/Ctrl/Cmd => additive/toggle selection
 * - Node can be selected individually when the hit-test determines
 *   that the pointer is actually on the Node
 * - marquee selection selects model objects but deliberately excludes
 *   Node topology objects
 *
 * This last rule is important:
 *
 * Node IDs define structural connectivity; they do not mean that a
 * slab's four nodes should automatically become selected together
 * with the slab.
 */
export class SelectTool extends BaseTool {
  cursor = 'default';

  private dragStart: { x: number; y: number } | null = null;
  private initial = new Map<string, any>();
  private windowStart: { x: number; y: number } | null = null;
  private isWindowSelecting = false;

  onMouseDown(e: CanvasEvent, ctx: ToolContext) {
    const shape = ctx.hitTest(e.x, e.y);
    const multi = e.rawEvent.shiftKey || e.rawEvent.ctrlKey || e.rawEvent.metaKey;

    /*
     * ---------------------------------------------------------------
     * OBJECT CLICK
     * ---------------------------------------------------------------
     */
    if (shape) {
      const alreadySelected = ctx.getState().drawing.selectedShapeIds.includes(shape.id);
      if (multi && alreadySelected) {
        ctx.selectShape(shape.id, true);
        this.resetInteraction();
        return;
      }

      /*
       * A normal click selects EXACTLY the hit object.
       *
       * No nodeIds expansion is performed here.
       */
      ctx.selectShape(shape.id, multi);

      const selectedIds = multi
        ? new Set(ctx.getState().drawing.selectedShapeIds)
        : new Set([shape.id]);

      /*
       * Keep original geometry for drag operations.
       */
      this.initial.clear();
      for (const currentShape of ctx.getState().drawing.shapes) {
        if (selectedIds.has(currentShape.id)) {
          this.initial.set(currentShape.id, JSON.parse(JSON.stringify(currentShape)));
        }
      }

      this.dragStart = { x: e.x, y: e.y };
      this.windowStart = null;
      this.isWindowSelecting = false;

      ctx.beginHistory();
      return;
    }

    /*
     * ---------------------------------------------------------------
     * EMPTY CANVAS CLICK
     * ---------------------------------------------------------------
     */
    ctx.clearSelection();
    this.dragStart = null;
    this.initial.clear();
    this.windowStart = { x: e.x, y: e.y };
    this.isWindowSelecting = false;
  }

  onMouseMove(e: CanvasEvent, ctx: ToolContext) {
    /*
     * ---------------------------------------------------------------
     * MOVE SELECTED OBJECT(S)
     * ---------------------------------------------------------------
     */
    if (this.dragStart) {
      const dx = e.x - this.dragStart.x;
      const dy = e.y - this.dragStart.y;

      for (const [id, shape] of this.initial) {
        const next = 'geometry' in shape
          ? translateStructuralElement(shape, dx, dy)
          : this.translateLegacy(shape, dx, dy);
        ctx.updateShape(id, next as any);
      }
      return;
    }

    /*
     * ---------------------------------------------------------------
     * MARQUEE PREVIEW
     * ---------------------------------------------------------------
     */
    if (this.windowStart) {
      const dx = e.x - this.windowStart.x;
      const dy = e.y - this.windowStart.y;
      const dragDistance = Math.hypot(dx, dy);

      if (!this.isWindowSelecting && dragDistance < SELECTION_DRAG_THRESHOLD) {
        return;
      }
      this.isWindowSelecting = true;
    }
  }

  onMouseUp(e: CanvasEvent, ctx: ToolContext) {
    /*
     * ---------------------------------------------------------------
     * FINISH OBJECT DRAG
     * ---------------------------------------------------------------
     */
    if (this.dragStart) {
      this.dragStart = null;
      this.initial.clear();
      ctx.endHistory();
      return;
    }

    if (!this.windowStart) return;

    const start = this.windowStart;
    const end = { x: e.x, y: e.y };
    const dragDistance = Math.hypot(end.x - start.x, end.y - start.y);

    /*
     * A simple click on an empty point should NOT become a marquee.
     */
    if (!this.isWindowSelecting && dragDistance < SELECTION_DRAG_THRESHOLD) {
      this.resetInteraction();
      return;
    }

    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);

    const state = ctx.getState();
    const ids = state.drawing.shapes
      .filter((shape) => shape.pageIndex === state.pdf.currentPage)
      /*
       * IMPORTANT:
       *
       * Node is topology, not a marquee-selected companion of the
       * slab/member that owns it.
       *
       * Users can still click a Node directly.
       */
      .filter((shape) => shape.type !== 'node')
      .filter((shape) => {
        if ('geometry' in shape) {
          if (shape.type === 'beam' || shape.type === 'wall') {
            return segmentIntersectsRect(shape.geometry.start, shape.geometry.end, minX, minY, maxX, maxY);
          }
          const bounds = elementBounds(shape);
          return bounds.maxX >= minX && bounds.minX <= maxX && bounds.maxY >= minY && bounds.minY <= maxY;
        }
        if (shape.type === 'line' || shape.type === 'measure') {
          const [x1, y1, x2, y2] = shape.points;
          return segmentIntersectsRect({ x: x1, y: y1 }, { x: x2, y: y2 }, minX, minY, maxX, maxY);
        }
        const bounds = this.legacyBounds(shape as any);
        return bounds.maxX >= minX && bounds.minX <= maxX && bounds.maxY >= minY && bounds.minY <= maxY;
      })
      .map((shape) => shape.id);

    ctx.dispatch({ type: 'drawing/selectShapes', payload: ids });
    this.resetInteraction();
  }

  onKeyDown(e: KeyboardEvent, ctx: ToolContext) {
    if (e.key === 'Escape') {
      this.resetInteraction();
      ctx.endHistory();
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      ctx.deleteSelected();
    }
  }

  onCancel(ctx: ToolContext) {
    this.resetInteraction();
    ctx.endHistory();
  }

  private resetInteraction() {
    this.dragStart = null;
    this.windowStart = null;
    this.isWindowSelecting = false;
    this.initial.clear();
  }

  /**
   * Move legacy shapes.
   */
  private translateLegacy(shape: any, dx: number, dy: number) {
    const copy = { ...shape };
    if ('x' in copy) copy.x += dx;
    if ('y' in copy) copy.y += dy;
    if ('points' in copy) {
      copy.points = copy.points.map((value: number, index: number) => value + (index % 2 ? dy : dx));
    }
    return copy;
  }

  /**
   * Calculate bounds for legacy annotation elements.
   */
  private legacyBounds(shape: any) {
    if ('x' in shape && 'width' in shape) {
      return { minX: shape.x, minY: shape.y, maxX: shape.x + shape.width, maxY: shape.y + shape.height };
    }
    if ('points' in shape) {
      const xs = shape.points.filter((_: number, index: number) => index % 2 === 0);
      const ys = shape.points.filter((_: number, index: number) => index % 2 === 1);
      return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
    }
    return { minX: shape.x - 5, minY: shape.y - 5, maxX: shape.x + 5, maxY: shape.y + 5 };
  }
}
// // src/features/drawing/hooks/useHitTest.ts

import { useCallback } from 'react';
import type { Shape } from '@/app/store/slices/drawingSlice';
import type { Layer } from '@/app/store/slices/layerSlice';
import { distance, distanceToSegment, pointInPolygon } from '../geometry/geometryUtils';
import { hitTestStructuralElement } from '../geometry/hitTest';

/**
 * Hit tolerance used specifically for Node picking.
 *
 * Node picking must be more precise than slab picking. Otherwise a
 * slab's large filled area can win over a node located at one of
 * its corners.
 */
const NODE_PICK_TOLERANCE_FACTOR = 0.8;

/**
 * Hit-test one canvas point.
 *
 * Selection priority:
 *
 * 1. A nearby Node wins.
 * 2. Otherwise the top-most non-Node object wins.
 *
 * Exactly ONE shape is returned for one normal click.
 *
 * This separation is important because a slab owns node IDs as
 * topology, but the nodes are NOT automatically part of the slab's
 * selection state.
 */
export function useHitTest(shapes: Shape[], layers: Layer[], tolerance = 5) {
  return useCallback((x: number, y: number): Shape | null => {
    const validLayerIds = new Set(layers.filter((layer) => layer.visible && !layer.locked).map((layer) => layer.id));
    const currentPageShapes = shapes.filter((shape) => validLayerIds.has(shape.layerId));

    /*
     * -------------------------------------------------------------
     * 1. NODE PICKING
     * -------------------------------------------------------------
     *
     * Only a genuinely nearby Node is considered here.
     */
    const nodeTolerance = Math.max(1, tolerance * NODE_PICK_TOLERANCE_FACTOR);
    for (let i = currentPageShapes.length - 1; i >= 0; i -= 1) {
      const shape = currentPageShapes[i];
      if (!('geometry' in shape) || shape.type !== 'node') continue;
      const g = shape.geometry;
      if (Math.hypot(g.x - x, g.y - y) <= nodeTolerance) {
        return shape;
      }
    }

    /*
     * -------------------------------------------------------------
     * 2. ALL OTHER OBJECTS
     * -------------------------------------------------------------
     *
     * Nodes are intentionally excluded because they have already
     * been resolved in the first pass.
     *
     * Iterate backwards so later shapes behave like the top-most
     * object when zIndex is equal.
     */
    for (let i = currentPageShapes.length - 1; i >= 0; i -= 1) {
      const shape = currentPageShapes[i];

      if ('geometry' in shape && 'style' in shape) {
        if (shape.type === 'node') continue;
        if (hitTestStructuralElement(shape as any, { x, y }, tolerance)) {
          return shape;
        }
        continue;
      }

      /*
       * Legacy annotation shapes.
       */
      let hit = false;

      switch (shape.type) {
        case 'point':
          hit = distance({ x, y }, { x: shape.x, y: shape.y }) <= shape.radius + tolerance;
          break;

        case 'line':
          hit = distanceToSegment({ x, y }, { x: shape.points[0], y: shape.points[1] }, { x: shape.points[2], y: shape.points[3] }) <= tolerance;
          break;

        case 'polyline':
        case 'measure': {
          for (let j = 0; j < shape.points.length - 2; j += 2) {
            if (distanceToSegment({ x, y }, { x: shape.points[j], y: shape.points[j + 1] }, { x: shape.points[j + 2], y: shape.points[j + 3] }) <= tolerance) {
              hit = true;
              break;
            }
          }
          break;
        }

        case 'polygon': {
          const points = Array.from({ length: shape.points.length / 2 }, (_, index) => ({
            x: shape.points[index * 2],
            y: shape.points[index * 2 + 1],
          }));
          hit = pointInPolygon({ x, y }, points);
          if (!hit && points.length >= 2) {
            for (let j = 0; j < points.length; j += 1) {
              const a = points[j];
              const b = points[(j + 1) % points.length];
              if (distanceToSegment({ x, y }, a, b) <= tolerance) {
                hit = true;
                break;
              }
            }
          }
          break;
        }

        case 'rectangle':
          hit = x >= shape.x - tolerance && x <= shape.x + shape.width + tolerance &&
                y >= shape.y - tolerance && y <= shape.y + shape.height + tolerance;
          break;

        case 'circle':
          hit = distance({ x, y }, { x: shape.x, y: shape.y }) <= shape.radius + tolerance;
          break;

        case 'text': {
          const width = shape.text.length * shape.fontSize * 0.6;
          const height = shape.fontSize * 1.2;
          hit = x >= shape.x && x <= shape.x + width && y >= shape.y && y <= shape.y + height;
          break;
        }

        default:
          hit = false;
      }

      if (hit) return shape;
    }

    return null;
  }, [shapes, layers, tolerance]);
}
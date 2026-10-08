// src/features/stories/storyGeometry.ts
import type { Shape } from '@/app/store/slices/drawingSlice';
import type { StructuralElement } from '@/features/drawing/elements/elementTypes';
import type { XY } from '@/core/coordinate/storyTransform';

const STRUCTURAL = new Set(['node', 'column', 'beam', 'wall', 'slab', 'portalFrame']);

export function isStructural(shape: Shape): shape is StructuralElement {
  return STRUCTURAL.has(shape.type) && 'geometry' in shape;
}

/** Boundary / key points of a structural element in its own page coordinates. */
export function elementVertices(e: StructuralElement): XY[] {
  switch (e.type) {
    case 'node':
      return [{ x: e.geometry.x, y: e.geometry.y }];
    case 'column':
      return [{ x: e.geometry.x + e.geometry.width / 2, y: e.geometry.y + e.geometry.depth / 2 }];
    case 'beam':
    case 'wall':
    case 'portalFrame':
      return [e.geometry.start, e.geometry.end];
    case 'slab':
      return e.geometry.points;
    default:
      return [];
  }
}

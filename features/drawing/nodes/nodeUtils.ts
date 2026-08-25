import { nanoid } from 'nanoid';

import type { PagePoint } from '@/core/coordinate/coordinateTypes';
import type { Shape } from '@/app/store/slices/drawingSlice'; // 新增：引入 Shape
import type { ElementStyle, NodeElement, StructuralElement,} from '../elements/elementTypes';

import { DEFAULT_ELEMENT_STYLE, prefixForType,} from '../elements/elementDefaults';

export interface NodeToleranceOptions { tolerance?: number;}

/**
 * Default node matching tolerance in PDF page coordinates.
 *
 * This is deliberately small.
 * The normal snap engine is responsible for bringing the mouse to a
 * structural point first; this tolerance only handles the final
 * "mouse up" position and imported / legacy geometry.
 */
const DEFAULT_NODE_TOLERANCE = 8;

/**
 * Return all existing node elements.
 */
export function getNodes(elements: Shape[]): NodeElement[] {
  return elements.filter(
    (element): element is NodeElement => element.type === 'node'
  );
}

/**
 * Find an existing node close to a page point.
 */
export function findNodeAtPoint(
  point: PagePoint,
  elements: Shape[], // 修改为 Shape[]
  options: NodeToleranceOptions = {}
): NodeElement | null {
  const tolerance = options.tolerance ?? DEFAULT_NODE_TOLERANCE;
  const nodes = getNodes(elements);
  let bestNode: NodeElement | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const node of nodes) {
    const distance = Math.hypot(node.geometry.x - point.x, node.geometry.y - point.y);
    if (distance <= tolerance && distance < bestDistance) {
      bestNode = node;
      bestDistance = distance;
    }
  }
  return bestNode;
}

/**
 * Find the node nearest to a point without enforcing a tolerance.
 */
export function findNearestNode(
  point: PagePoint,
  elements: Shape[] // 修改为 Shape[]
): NodeElement | null {
  const nodes = getNodes(elements);
  let bestNode: NodeElement | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const node of nodes) {
    const distance = Math.hypot(node.geometry.x - point.x, node.geometry.y - point.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestNode = node;
    }
  }
  return bestNode;
}

/**
 * Generate the next node label.
 */
export function ensureNodeLabel(elements: Shape[]): string { // 修改为 Shape[]
  const used = new Set(
    getNodes(elements).map((node) => node.label || node.properties.label)
  );
  let index = 1;
  while (used.has(`N-${String(index).padStart(3, '0')}`)) {
    index += 1;
  }
  return `N-${String(index).padStart(3, '0')}`;
}

/**
 * Create a new structural node object with a known ID.
 *
 * The ID is deliberately generated before dispatching addShape(),
 * because members need to reference this exact ID.
 */
export function createNodeElement(params: {
  point: PagePoint;
  pageIndex: number;
  layerId: string;
  style?: Partial<ElementStyle>;
  label: string;
}): NodeElement {
  const {
    point,
    pageIndex,
    layerId,
    style,
    label,
  } = params;

  const now =
    new Date().toISOString();

  return {
    id: nanoid(),
    type: 'node',
    pageIndex,
    layerId,

    geometry: {
      x: point.x,
      y: point.y,
    },

    properties: {
      label,
      x: point.x,
      y: point.y,
    },

    style: {
      ...DEFAULT_ELEMENT_STYLE,
      ...style,
      color:
        style?.color ??
        '#111827',
    },

    label,

    createdAt: now,
    updatedAt: now,

    zIndex: 100,
  };
}

/**
 * Resolve a point into an existing node or a newly-created node.
 *
 * IMPORTANT:
 * The caller is still responsible for dispatching the returned
 * node through addShape().
 */
export function resolveNode(
  point: PagePoint,
  elements: Shape[], // 修改为 Shape[]
  params: {
    pageIndex: number;
    layerId: string;
    style?: Partial<ElementStyle>;
    tolerance?: number;
  }
): { node: NodeElement; isNew: boolean } {
  const existing = findNodeAtPoint(point, elements, {
    tolerance: params.tolerance ?? DEFAULT_NODE_TOLERANCE,
  });

  if (existing) {
    return { node: existing, isNew: false };
  }

  const label = ensureNodeLabel(elements);
  return {
    node: createNodeElement({
      point,
      pageIndex: params.pageIndex,
      layerId: params.layerId,
      style: params.style,
      label,
    }),
    isNew: true,
  };
}

/**
 * Return the actual point of a resolved node.
 *
 * This guarantees that geometry and topology use exactly the same
 * coordinates.
 */
export function nodePoint(
  node: NodeElement,
): PagePoint {
  return {
    x: node.geometry.x,
    y: node.geometry.y,
  };
}

/**
 * Find all structural members connected to a node.
 */
export function getConnectedMembers(
  nodeId: string,
  elements: Shape[] // 修改为 Shape[]
): StructuralElement[] {
  return elements.filter((element): element is StructuralElement => {
    // 排除 node 和所有 legacy shapes
    if (
      element.type === 'node' ||
      element.type === 'point' ||
      element.type === 'line' ||
      element.type === 'polyline' ||
      element.type === 'polygon' ||
      element.type === 'rectangle' ||
      element.type === 'circle' ||
      element.type === 'text' ||
      element.type === 'measure'
    ) {
      return false;
    }
    
    // 此时 TypeScript 知道 element 必然是 StructuralElement
    const p = (element as StructuralElement).properties as any;
    
    if (element.type === 'column') {
      return p.nodeId === nodeId;
    }
    if (
      element.type === 'beam' ||
      element.type === 'wall' ||
      element.type === 'portalFrame'
    ) {
      return p.startNodeId === nodeId || p.endNodeId === nodeId;
    }
    return false;
  });
}

/**
 * Return a human-readable node reference.
 */
export function nodeReference(
  node: NodeElement | null | undefined,
): string {
  if (!node) {
    return '';
  }

  return (
    node.label ||
    node.properties.label ||
    node.id
  );
}

/**
 * Return the structural prefix for a node-aware member.
 *
 * Kept here so future node/member creation code does not duplicate
 * type prefix rules.
 */
export function structuralPrefix(
  element: StructuralElement,
): string {
  return prefixForType(
    element.type,
  );
}
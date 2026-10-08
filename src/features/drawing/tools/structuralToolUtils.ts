// src/features/drawing/tools/structuralToolUtils.ts

import type { ToolContext } from './BaseTool';
import type { StructuralElementType, NodeElement } from '../elements/elementTypes';
import {
  DEFAULT_ELEMENT_STYLE,
  getStructuralDefaults,
  prefixForType,
} from '../elements/elementDefaults';
import { nanoid } from '@reduxjs/toolkit';

export function makeBase(ctx: ToolContext, type: StructuralElementType, geometry: any) {
  const state = ctx.getState();
  const drawing = state.drawing;

  return {
    id: 'temp',
    type,
    pageIndex: state.pdf.currentPage,
    sheetId: state.planSheet.activeSheetId ?? undefined,
    layerId: state.layer.activeLayerId,
    geometry,
    properties: {} as any,
    style: {
      ...DEFAULT_ELEMENT_STYLE,
      color: drawing.currentStrokeColor,
      strokeWidth: drawing.currentStrokeWidth,
      opacity: drawing.currentOpacity,
      fillColor: drawing.currentFillColor,
    },
    label: '',
    createdAt: '',
    updatedAt: '',
    zIndex: 0,
  } as any;
}

export function structuralDefaults(
  type: StructuralElementType,
  scaleDenominator: number,
  scaleNumerator = 1,
) {
  if (type === 'node') return undefined;
  return getStructuralDefaults(scaleDenominator, scaleNumerator)[type];
}

export function ensureLabel(ctx: ToolContext, type: StructuralElementType) {
  const state = ctx.getState();
  const prefix = prefixForType(type);
  const used = state.drawing.shapes
    .filter((s: any) =>
      s.pageIndex === state.pdf.currentPage &&
      s.type === type &&
      (!state.planSheet.activeSheetId || !s.sheetId || s.sheetId === state.planSheet.activeSheetId)
    )
    .map((s: any) => s.label as string);

  let i = 1;
  while (used.includes(`${prefix}-${String(i).padStart(3, '0')}`)) i += 1;
  return `${prefix}-${String(i).padStart(3, '0')}`;
}

export function distance(p1: { x: number; y: number }, p2: { x: number; y: number }) {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

export interface NodeResult {
  id: string;
  isNew: boolean;
  shape?: any;
  snappedPoint: { x: number; y: number };
}

/**
 * Resolve a structural node without applying a second grid snap.
 *
 * Grid/object snapping is already performed by the canvas snap engine. A
 * second snap here could move an endpoint or intersection away from the
 * deliberately selected object-snap point. This helper only reuses nearby
 * page-local nodes or creates a new node at the supplied snapped point.
 */
export function getOrCreateNode(
  ctx: ToolContext,
  point: { x: number; y: number },
  tolerance = 5,
): NodeResult {
  const state = ctx.getState();
  const pageIndex = state.pdf.currentPage;
  const activeSheetId = state.planSheet.activeSheetId;
  const safePoint = {
    x: Number.isFinite(point.x) ? point.x : 0,
    y: Number.isFinite(point.y) ? point.y : 0,
  };

  const nodes = state.drawing.shapes.filter(
    (shape: any): shape is NodeElement =>
      shape.pageIndex === pageIndex &&
      shape.type === 'node' &&
      (!activeSheetId || !shape.sheetId || shape.sheetId === activeSheetId),
  );

  let nearestNode: NodeElement | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const node of nodes) {
    const nodePoint = { x: node.geometry.x, y: node.geometry.y };
    const nodeDistance = distance(nodePoint, safePoint);

    if (nodeDistance <= tolerance && nodeDistance < nearestDistance) {
      nearestNode = node;
      nearestDistance = nodeDistance;
    }
  }

  if (nearestNode) {
    return {
      id: nearestNode.id,
      isNew: false,
      snappedPoint: { x: nearestNode.geometry.x, y: nearestNode.geometry.y },
    };
  }

  const newId = nanoid();
  const label = ensureLabel(ctx, 'node');
  const shape = {
    ...makeBase(ctx, 'node', safePoint),
    id: newId,
    label,
    properties: { label },
  } as any;

  return {
    id: newId,
    isNew: true,
    shape,
    snappedPoint: { x: safePoint.x, y: safePoint.y },
  };
}

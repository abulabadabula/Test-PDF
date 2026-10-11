// src/features/storeys/storeyModel.ts
//
// Pure helpers that connect the storey list with Plan Sheets, their alignment
// (the "Story" placement records) and the drawn members.
//
//  * storey -> Plan Sheet (following "similar to")
//  * the vertical support check between storeys
//  * copying members from one storey's plan onto another's

import { nanoid } from '@reduxjs/toolkit';

import type { RootState } from '@/app/store';
import type { Shape } from '@/app/store/slices/drawingSlice';
import { effectiveSheetId, type Storey } from '@/app/store/slices/storeySlice';
import type { Story } from '@/app/store/slices/storySlice';
import {
  frameForStory,
  frameToPage,
  pageToFrame,
  type StoryFrame,
  type XY,
} from '@/core/coordinate/storyTransform';
import { pagePtToRealMm } from '@/core/coordinate/engineeringScale';
import type { PlanSheet } from '@/features/plan-sheets/planSheetTypes';
import type {
  NodeElement,
  StructuralElement,
  StructuralElementType,
} from '@/features/drawing/elements/elementTypes';
import { prefixForType } from '@/features/drawing/elements/elementDefaults';
import { createNodeElement } from '@/features/drawing/nodes/nodeUtils';
import { isStructural } from '@/features/stories/storyGeometry';
import {
  nodesOfStory,
  shapeBelongsToStory,
  type FrameNode,
} from '@/features/stories/storyLinks';

// ---------------------------------------------------------------------------
// Storey <-> Plan Sheet context
// ---------------------------------------------------------------------------

export interface StoreyContext {
  storey: Storey;
  /** Plan Sheet the storey is drawn on (after following "similar to"). */
  sheet: PlanSheet;
  /** Alignment record of that sheet, with the storey's own name and elevation. */
  story: Story;
  frame: StoryFrame;
}

/** Placement of a sheet; sheets that were never aligned get a neutral one. */
function placementOf(state: RootState, sheet: PlanSheet): Story {
  const found = state.story.stories.find((item) => item.sheetId === sheet.id);
  if (found) return found;

  return {
    id: `placement-${sheet.id}`,
    sheetId: sheet.id,
    pageIndex: sheet.sourcePage,
    name: sheet.name,
    elevationMm: 0,
    overlayVisible: false,
    overlayOpacity: 0.4,
    alignmentLocked: false,
    tint: '#ef4444',
    showGhostElements: true,
    adjust: { dxMm: 0, dyMm: 0, rotationDeg: 0 },
  };
}

/** Every storey that has a Plan Sheet, from the lowest up. */
export function getStoreyContexts(state: RootState): StoreyContext[] {
  const { storeys } = state.storey;
  const sheets = state.planSheet.sheets;
  const contexts: StoreyContext[] = [];

  for (const storey of storeys) {
    const sheetId = effectiveSheetId(storey, storeys);
    const sheet = sheetId ? sheets.find((item) => item.id === sheetId) : undefined;
    if (!sheet) continue;

    const placement = placementOf(state, sheet);
    const story: Story = {
      ...placement,
      id: storey.id,
      name: storey.name,
      elevationMm: storey.elevationMm,
      sheetId: sheet.id,
    };

    contexts.push({
      storey,
      sheet,
      story,
      frame: frameForStory(
        state.pageCoordinate.pages,
        state.pageCoordinate.sheets,
        story,
        sheets,
      ),
    });
  }

  return contexts;
}

export function getStoreyContext(
  state: RootState,
  storeyId: string | null,
): StoreyContext | null {
  if (!storeyId) return null;
  return getStoreyContexts(state).find((item) => item.storey.id === storeyId) ?? null;
}

/** Story-shaped view of the storey list, for the level-link helpers. */
export function storiesFromStoreys(state: RootState): Story[] {
  return getStoreyContexts(state).map((context) => context.story);
}

/** Names of the storeys that use a Plan Sheet (masters and similar ones). */
export function storeysUsingSheet(
  storeys: Storey[],
  sheetId: string,
): Storey[] {
  return storeys.filter((storey) => effectiveSheetId(storey, storeys) === sheetId);
}

// ---------------------------------------------------------------------------
// Vertical support check
// ---------------------------------------------------------------------------

export interface SupportIssue {
  key: string;
  upperStoreyId: string;
  lowerStoreyId: string;
  upperName: string;
  lowerName: string;
  /** Element at the upper storey that has no support below. */
  elementId: string;
  elementType: StructuralElementType;
  elementLabels: string[];
  /** Node of the upper element that sits on the unsupported point, if known. */
  upperNodeId?: string;
  /** Unsupported point in the shared frame, mm. */
  pointMm: XY;
  /** Nearest lower node, when one is closer than the search radius. */
  nearest?: { nodeId: string; distMm: number; pointMm: XY };
}

export interface SupportCheckResult {
  issues: SupportIssue[];
  checkedPoints: number;
  storeysChecked: number;
}

const VERTICAL_TYPES = new Set<StructuralElementType>(['column', 'wall', 'portalFrame']);

interface VerticalPoint {
  element: StructuralElement;
  point: XY;
  nodeId?: string;
}

function verticalPointsOf(
  shapes: Shape[],
  context: StoreyContext,
): VerticalPoint[] {
  const out: VerticalPoint[] = [];
  const sourcePage = context.sheet.sourcePage;

  for (const shape of shapes) {
    if (!isStructural(shape) || !VERTICAL_TYPES.has(shape.type)) continue;
    if (!shapeBelongsToStory(shape, context.story, sourcePage)) continue;

    const properties = shape.properties as Record<string, unknown>;
    const nodeIdOf = (value: unknown) => (typeof value === 'string' ? value : undefined);

    if (shape.type === 'column') {
      out.push({
        element: shape,
        point: pageToFrame(
          {
            x: shape.geometry.x + shape.geometry.width / 2,
            y: shape.geometry.y + shape.geometry.depth / 2,
          },
          context.frame,
        ),
        nodeId: nodeIdOf(properties.nodeId),
      });
    } else if (shape.type === 'wall' || shape.type === 'portalFrame') {
      out.push({
        element: shape,
        point: pageToFrame(shape.geometry.start, context.frame),
        nodeId: nodeIdOf(properties.startNodeId),
      });
      out.push({
        element: shape,
        point: pageToFrame(shape.geometry.end, context.frame),
        nodeId: nodeIdOf(properties.endNodeId),
      });
    }
  }

  return out;
}

/**
 * Columns, walls and portal frames of a storey are carried by the storey below.
 * Report every such point that has no node (or vertical member) under it.
 *
 * The lowest storey stands on the base, which is always taken as supported.
 */
export function checkSupportNodes(
  state: RootState,
  toleranceMm: number,
  searchRadiusMm: number,
): SupportCheckResult {
  const contexts = getStoreyContexts(state);
  const shapes = state.drawing.shapes;
  const planSheets = state.planSheet.sheets;

  const issues: SupportIssue[] = [];
  let checkedPoints = 0;

  for (let index = 1; index < contexts.length; index += 1) {
    const lower = contexts[index - 1];
    const upper = contexts[index];

    const lowerNodes: FrameNode[] = nodesOfStory(
      shapes,
      lower.story,
      state.pageCoordinate.pages,
      state.pageCoordinate.sheets,
      planSheets,
    );

    // A column / wall end of the lower storey also carries a load path.
    const lowerPoints: { nodeId?: string; point: XY }[] = [
      ...lowerNodes.map((node) => ({ nodeId: node.id, point: node.mm })),
      ...verticalPointsOf(shapes, lower).map((item) => ({
        nodeId: item.nodeId,
        point: item.point,
      })),
    ];

    const seen = new Map<string, SupportIssue>();

    for (const item of verticalPointsOf(shapes, upper)) {
      checkedPoints += 1;

      let best: { nodeId?: string; point: XY; dist: number } | null = null;
      for (const candidate of lowerPoints) {
        const dist = Math.hypot(
          candidate.point.x - item.point.x,
          candidate.point.y - item.point.y,
        );
        if (!best || dist < best.dist) {
          best = { nodeId: candidate.nodeId, point: candidate.point, dist };
        }
      }

      if (best && best.dist <= toleranceMm) continue;

      const key = `${upper.storey.id}|${Math.round(item.point.x)}|${Math.round(item.point.y)}`;
      const label = item.element.label || item.element.id;
      const existing = seen.get(key);

      if (existing) {
        if (!existing.elementLabels.includes(label)) existing.elementLabels.push(label);
        continue;
      }

      const issue: SupportIssue = {
        key,
        upperStoreyId: upper.storey.id,
        lowerStoreyId: lower.storey.id,
        upperName: upper.storey.name,
        lowerName: lower.storey.name,
        elementId: item.element.id,
        elementType: item.element.type,
        elementLabels: [label],
        upperNodeId: item.nodeId,
        pointMm: item.point,
        nearest:
          best && best.nodeId && best.dist <= searchRadiusMm
            ? { nodeId: best.nodeId, distMm: best.dist, pointMm: best.point }
            : undefined,
      };

      seen.set(key, issue);
      issues.push(issue);
    }
  }

  return {
    issues,
    checkedPoints,
    storeysChecked: Math.max(0, contexts.length - 1),
  };
}

/** A new support node on the lower storey's plan, beneath the unsupported point. */
export function buildSupportNode(
  state: RootState,
  issue: SupportIssue,
): NodeElement | null {
  const lower = getStoreyContext(state, issue.lowerStoreyId);
  if (!lower) return null;

  const point = frameToPage(issue.pointMm, lower.frame);
  const sameSheet = (shape: Shape) =>
    shape.pageIndex === lower.sheet.sourcePage &&
    (shape.sheetId ?? '') === lower.sheet.id;

  return createNodeElement({
    point,
    pageIndex: lower.sheet.sourcePage,
    sheetId: lower.sheet.id,
    label: nextLabel(state.drawing.shapes.filter(sameSheet), 'node'),
  });
}

// ---------------------------------------------------------------------------
// Copy members between storeys
// ---------------------------------------------------------------------------

export type CopyableType = Exclude<StructuralElementType, 'node'>;

export const COPYABLE_TYPES: { type: CopyableType; label: string }[] = [
  { type: 'column', label: 'Columns' },
  { type: 'beam', label: 'Beams' },
  { type: 'wall', label: 'Walls' },
  { type: 'portalFrame', label: 'Portal frames' },
  { type: 'slab', label: 'Slabs' },
];

export interface CopyMembersOptions {
  sourceStoreyId: string;
  targetStoreyId: string;
  types: CopyableType[];
  /** Leave out members that already exist at the same place on the target. */
  skipExisting: boolean;
}

export interface CopyMembersPlan {
  shapes: Shape[];
  copied: number;
  skipped: number;
  nodesCreated: number;
  nodesReused: number;
  error?: string;
}

/** Nodes closer than this on the target plan are taken as the same node. */
const NODE_MERGE_TOLERANCE_MM = 25;

function nextLabel(shapes: Shape[], type: StructuralElementType): string {
  const prefix = prefixForType(type);
  const used = new Set(
    shapes.filter((shape) => shape.type === type).map((shape) => shape.label),
  );

  let index = 1;
  while (used.has(`${prefix}-${String(index).padStart(3, '0')}`)) index += 1;

  return `${prefix}-${String(index).padStart(3, '0')}`;
}

const mmPerPoint = (frame: StoryFrame) =>
  pagePtToRealMm(1, frame.cs.scaleNumerator, frame.cs.scaleDenominator) || 1;

/**
 * Work out the shapes needed to copy the chosen member types from one storey's
 * plan to another's. Points go through the shared frame, so alignment, scale and
 * rotation differences between the two Plan Sheets are taken care of. Nothing is
 * dispatched here.
 */
export function planCopyMembers(
  state: RootState,
  options: CopyMembersOptions,
): CopyMembersPlan {
  const empty: CopyMembersPlan = {
    shapes: [],
    copied: 0,
    skipped: 0,
    nodesCreated: 0,
    nodesReused: 0,
  };

  const source = getStoreyContext(state, options.sourceStoreyId);
  const target = getStoreyContext(state, options.targetStoreyId);

  if (!source || !target) {
    return { ...empty, error: 'Both storeys need a Plan Sheet before members can be copied.' };
  }

  if (source.sheet.id === target.sheet.id) {
    return {
      ...empty,
      error: 'Both storeys use the same Plan Sheet, so they already share their members.',
    };
  }

  if (!options.types.length) {
    return { ...empty, error: 'Choose at least one member type to copy.' };
  }

  const all = state.drawing.shapes;
  const sourceShapes = all.filter(
    (shape): shape is StructuralElement =>
      isStructural(shape) &&
      shapeBelongsToStory(shape, source.story, source.sheet.sourcePage),
  );
  const targetShapes = all.filter(
    (shape) =>
      isStructural(shape) &&
      shapeBelongsToStory(shape, target.story, target.sheet.sourcePage),
  );

  const sourceNodes = new Map<string, NodeElement>();
  for (const shape of sourceShapes) {
    if (shape.type === 'node') sourceNodes.set(shape.id, shape);
  }

  const toTarget = (point: XY): XY =>
    frameToPage(pageToFrame(point, source.frame), target.frame);

  // Section sizes are stored in page units, so they follow the drawing scale.
  const sizeFactor = mmPerPoint(source.frame) / mmPerPoint(target.frame);
  const rotationShift = target.frame.adj.rotationDeg - source.frame.adj.rotationDeg;
  const mergeTolerance = NODE_MERGE_TOLERANCE_MM / mmPerPoint(target.frame);

  const created: Shape[] = [];
  const now = new Date().toISOString();
  const targetNodes: NodeElement[] = targetShapes.filter(
    (shape): shape is NodeElement => shape.type === 'node',
  );

  let nodesCreated = 0;
  let nodesReused = 0;

  const labelPool = () => [...targetShapes, ...created];

  /** Node of the target plan at `point`, reusing a nearby one or creating it. */
  const nodeAt = (point: XY, sourceNodeId?: string): string => {
    let nearest: NodeElement | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const node of targetNodes) {
      const distance = Math.hypot(node.geometry.x - point.x, node.geometry.y - point.y);
      if (distance <= mergeTolerance && distance < nearestDistance) {
        nearest = node;
        nearestDistance = distance;
      }
    }

    if (nearest) {
      nodesReused += 1;
      return nearest.id;
    }

    const original = sourceNodeId ? sourceNodes.get(sourceNodeId) : undefined;
    const label = nextLabel(labelPool(), 'node');
    const node: NodeElement = original
      ? {
          ...(JSON.parse(JSON.stringify(original)) as NodeElement),
          id: nanoid(),
          pageIndex: target.sheet.sourcePage,
          sheetId: target.sheet.id,
          geometry: { x: point.x, y: point.y },
          label,
          properties: { ...original.properties, label, x: point.x, y: point.y },
          createdAt: now,
          updatedAt: now,
        }
      : createNodeElement({
          point,
          pageIndex: target.sheet.sourcePage,
          sheetId: target.sheet.id,
          label,
        });

    node.sheetId = target.sheet.id;
    created.push(node);
    targetNodes.push(node);
    nodesCreated += 1;
    return node.id;
  };

  const keyPoints = (element: StructuralElement): XY[] => {
    switch (element.type) {
      case 'column':
        return [
          {
            x: element.geometry.x + element.geometry.width / 2,
            y: element.geometry.y + element.geometry.depth / 2,
          },
        ];
      case 'beam':
      case 'wall':
      case 'portalFrame':
        return [element.geometry.start, element.geometry.end];
      case 'slab':
        return element.geometry.points;
      default:
        return [];
    }
  };

  const samePlace = (a: XY[], b: XY[]) =>
    a.length === b.length &&
    a.every((p) =>
      b.some((q) => Math.hypot(p.x - q.x, p.y - q.y) <= mergeTolerance),
    );

  let copied = 0;
  let skipped = 0;

  const members = sourceShapes
    .filter(
      (shape) =>
        shape.type !== 'node' && options.types.includes(shape.type as CopyableType),
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  for (const member of members) {
    const clone = JSON.parse(JSON.stringify(member)) as StructuralElement;
    const geometry = clone.geometry as any;
    const properties = clone.properties as any;

    if (clone.type === 'column') {
      const centre = toTarget({
        x: geometry.x + geometry.width / 2,
        y: geometry.y + geometry.depth / 2,
      });
      geometry.width *= sizeFactor;
      geometry.depth *= sizeFactor;
      geometry.x = centre.x - geometry.width / 2;
      geometry.y = centre.y - geometry.depth / 2;
      geometry.rotation = (geometry.rotation ?? 0) + rotationShift;
    } else if (
      clone.type === 'beam' ||
      clone.type === 'wall' ||
      clone.type === 'portalFrame'
    ) {
      geometry.start = toTarget(geometry.start);
      geometry.end = toTarget(geometry.end);

      if (clone.type === 'beam') {
        geometry.width *= sizeFactor;
        geometry.depth *= sizeFactor;
      } else if (clone.type === 'wall') {
        geometry.thickness *= sizeFactor;
      } else {
        geometry.height *= sizeFactor;
        geometry.columnWidth *= sizeFactor;
        geometry.columnDepth *= sizeFactor;
        geometry.beamWidth *= sizeFactor;
        geometry.beamDepth *= sizeFactor;
      }
    } else if (clone.type === 'slab') {
      geometry.points = (geometry.points as XY[]).map(toTarget);
    }

    if (
      options.skipExisting &&
      targetShapes.some(
        (existing) =>
          isStructural(existing) &&
          existing.type === clone.type &&
          samePlace(keyPoints(existing), keyPoints(clone)),
      )
    ) {
      skipped += 1;
      continue;
    }

    // Re-link the member to nodes of the target plan.
    if (clone.type === 'column') {
      properties.nodeId = nodeAt(
        {
          x: geometry.x + geometry.width / 2,
          y: geometry.y + geometry.depth / 2,
        },
        (member.properties as any).nodeId,
      );
    } else if (
      clone.type === 'beam' ||
      clone.type === 'wall' ||
      clone.type === 'portalFrame'
    ) {
      properties.startNodeId = nodeAt(
        geometry.start,
        (member.properties as any).startNodeId,
      );
      properties.endNodeId = nodeAt(
        geometry.end,
        (member.properties as any).endNodeId,
      );
    } else if (clone.type === 'slab') {
      const sourceIds: unknown[] = Array.isArray((member.properties as any).nodeIds)
        ? (member.properties as any).nodeIds
        : [];
      properties.nodeIds = (geometry.points as XY[]).map((point, index) =>
        nodeAt(
          point,
          typeof sourceIds[index] === 'string' ? (sourceIds[index] as string) : undefined,
        ),
      );
    }

    const label = nextLabel(labelPool(), clone.type);

    clone.id = nanoid();
    clone.pageIndex = target.sheet.sourcePage;
    clone.sheetId = target.sheet.id;
    clone.label = label;
    properties.label = label;
    clone.createdAt = now;
    clone.updatedAt = now;

    created.push(clone);
    copied += 1;
  }

  return {
    shapes: created,
    copied,
    skipped,
    nodesCreated,
    nodesReused,
  };
}

// src/features/storeys/storeyActions.ts
//
// Store-level actions for the storey panel. They read the latest state from the
// store, so they can be called from event handlers without stale closures.

import { toast } from 'sonner';

import { store } from '@/app/store';
import {
  addShape,
  beginHistoryTransaction,
  endHistoryTransaction,
  importShapes,
  selectShape,
  updateShape,
} from '@/app/store/slices/drawingSlice';
import { ensureSheet } from '@/app/store/slices/pageCoordinateSlice';
import { setCurrentPage } from '@/app/store/slices/pdfSlice';
import { setActivePlanSheet } from '@/app/store/slices/planSheetSlice';
import { setActiveStorey } from '@/app/store/slices/storeySlice';
import {
  basePageToStoryPoint,
  frameToPage,
} from '@/core/coordinate/storyTransform';
import { nodesOfStory, pairNodes } from '@/features/stories/storyLinks';
import {
  buildSupportNode,
  getStoreyContext,
  getStoreyContexts,
  planCopyMembers,
  type CopyMembersOptions,
  type SupportIssue,
} from './storeyModel';

/** Make a storey the one being edited: show and activate its Plan Sheet. */
export function activateStorey(storeyId: string): boolean {
  const state = store.getState();
  const context = getStoreyContext(state, storeyId);

  if (!context) {
    toast.error('Assign a Plan Sheet to this storey first.');
    return false;
  }

  store.dispatch(setActiveStorey(storeyId));
  store.dispatch(
    ensureSheet({ sheetId: context.sheet.id, pageIndex: context.sheet.sourcePage }),
  );
  store.dispatch(setCurrentPage(context.sheet.sourcePage));
  store.dispatch(setActivePlanSheet(context.sheet.id));
  return true;
}

/** Copy members from one storey's plan to another's. Returns true on success. */
export function copyMembersBetweenStoreys(options: CopyMembersOptions): boolean {
  const plan = planCopyMembers(store.getState(), options);

  if (plan.error) {
    toast.error(plan.error);
    return false;
  }

  if (!plan.shapes.length) {
    toast.info(
      plan.skipped
        ? `Nothing to copy: all ${plan.skipped} member(s) already exist there.`
        : 'No members of the chosen types were found on the source storey.',
    );
    return false;
  }

  store.dispatch(beginHistoryTransaction());
  store.dispatch(importShapes(plan.shapes));
  store.dispatch(endHistoryTransaction());

  toast.success(
    `Copied ${plan.copied} member(s)` +
      (plan.nodesCreated ? `, ${plan.nodesCreated} new node(s)` : '') +
      (plan.skipped ? `, skipped ${plan.skipped} that already exist` : '') +
      '.',
  );
  return true;
}

/** Go to the storey of an unsupported element and select it. */
export function showSupportIssue(issue: SupportIssue) {
  if (!activateStorey(issue.upperStoreyId)) return;
  store.dispatch(selectShape({ id: issue.elementId }));
}

/** Add the missing support nodes on the lower storeys. Returns how many were added. */
export function addSupportNodes(issues: SupportIssue[]): number {
  let added = 0;

  store.dispatch(beginHistoryTransaction());

  for (const issue of issues) {
    const node = buildSupportNode(store.getState(), issue);
    if (!node) continue;

    store.dispatch(addShape(node));
    added += 1;
  }

  store.dispatch(endHistoryTransaction());

  return added;
}

/** Move an unsupported node onto the nearest lower node. */
export function snapToSupport(issue: SupportIssue): boolean {
  const state = store.getState();
  const upper = getStoreyContext(state, issue.upperStoreyId);
  const node = state.drawing.shapes.find((shape) => shape.id === issue.upperNodeId);

  if (!upper || !issue.nearest || !node || !('geometry' in node)) return false;

  const target = frameToPage(issue.nearest.pointMm, upper.frame);

  store.dispatch(beginHistoryTransaction());
  store.dispatch(
    updateShape({
      id: node.id,
      changes: {
        geometry: { ...(node.geometry as object), x: target.x, y: target.y },
      } as never,
    }),
  );
  store.dispatch(endHistoryTransaction());

  return true;
}

/**
 * Pull the nodes of every other plan onto the nodes of the base plan, wherever
 * they are within the pull radius. Returns how many nodes moved.
 */
export function pullNodesToBase(): number | null {
  const state = store.getState();
  const contexts = getStoreyContexts(state);

  const baseSheetId = state.planSheet.baseSheetId;
  const base = contexts.find((context) => context.sheet.id === baseSheetId);

  if (!base) return null;

  const baseNodes = nodesOfStory(
    state.drawing.shapes,
    base.story,
    state.pageCoordinate.pages,
    state.pageCoordinate.sheets,
    state.planSheet.sheets,
  );

  const done = new Set<string>([base.sheet.id]);
  let moved = 0;

  store.dispatch(beginHistoryTransaction());

  for (const context of contexts) {
    // Typical floors share a sheet, so each sheet only needs to be pulled once.
    if (done.has(context.sheet.id)) continue;
    done.add(context.sheet.id);

    const latest = store.getState();
    const pairs = pairNodes(
      baseNodes,
      nodesOfStory(
        latest.drawing.shapes,
        context.story,
        latest.pageCoordinate.pages,
        latest.pageCoordinate.sheets,
        latest.planSheet.sheets,
      ),
      latest.story.pullRadiusMm,
    );

    for (const pair of pairs) {
      if (pair.distMm < 0.01) continue;

      const target = basePageToStoryPoint(pair.a.page, context.frame, base.frame);
      const node = latest.drawing.shapes.find((shape) => shape.id === pair.b.id);
      if (!node || !('geometry' in node)) continue;

      store.dispatch(
        updateShape({
          id: node.id,
          changes: {
            geometry: { ...(node.geometry as object), x: target.x, y: target.y },
          } as never,
        }),
      );
      moved += 1;
    }
  }

  store.dispatch(endHistoryTransaction());

  return moved;
}

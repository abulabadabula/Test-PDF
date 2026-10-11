// src/features/stories/StoryAlignOverlay.tsx
//
// Interactive alignment of an underlay plan against the base Plan Sheet.
// While active, a transparent layer captures the pointer: dragging moves the
// underlay, arrow keys nudge it (Shift = x10, Alt = fine), Enter / Esc
// finishes. The result is stored as the story's adjust.dxMm / dyMm, so it is
// exact in engineering millimetres and survives zoom changes.

import { useEffect, useRef } from 'react';
import { Check, Crosshair } from 'lucide-react';

import { store } from '@/app/store';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { moveSheetOrigin } from '@/app/store/slices/pageCoordinateSlice';
import { selectActivePlanSheet, selectBasePlanSheet } from '@/app/store/slices/planSheetSlice';
import {
  setAlignStory,
  updateStoryAdjust,
  type StoryAdjust,
} from '@/app/store/slices/storySlice';
import {
  adjustToPlace,
  baseFrameForSheet,
  foldAdjustIntoOrigin,
  frameForStory,
  planSheetForStory,
  storyPointToBasePage,
} from '@/core/coordinate/storyTransform';
import type { PageCoordinateSystem } from '@/core/coordinate/pageCoordinateSystem';
import { Button } from '@/components/ui/button';
import { centreUnderlayOnBase } from './underlayActions';

interface DragState {
  startX: number;
  startY: number;
  startAdj: StoryAdjust;
  /** Coordinate system of the sheet when the drag began. */
  startCs: PageCoordinateSystem;
}

export function StoryAlignOverlay() {
  const dispatch = useAppDispatch();

  const alignStoryId = useAppSelector((state) => state.story.alignStoryId);
  const stories = useAppSelector((state) => state.story.stories);
  const planSheets = useAppSelector((state) => state.planSheet.sheets);
  const baseSheet = useAppSelector(selectBasePlanSheet);
  const activeSheet = useAppSelector(selectActivePlanSheet);
  const displayScale = useAppSelector((state) => state.pdf.scale);

  const story = stories.find((item) => item.id === alignStoryId) ?? null;
  const sheet = story ? planSheetForStory(story, planSheets) : null;

  const drag = useRef<DragState | null>(null);
  const spaceDown = useRef(false);

  // Always read the latest values inside long-lived listeners.
  const latest = useRef({ story, sheet, baseSheet, displayScale });
  latest.current = { story, sheet, baseSheet, displayScale };

  /** Sheet frame as it is right now, read straight from the store. */
  const currentCs = (): PageCoordinateSystem | null => {
    const { story } = latest.current;
    if (!story) return null;

    const state = store.getState();
    return frameForStory(
      state.pageCoordinate.pages,
      state.pageCoordinate.sheets,
      story,
      state.planSheet.sheets,
    ).cs;
  };

  /**
   * Move the underlay so that it ends up `delta` (screen px) away from where
   * it was when the drag began. The resulting translation is folded into the
   * sheet's own origin marker, so the marker always sits on the shared origin.
   */
  const moveBy = (
    dxPx: number,
    dyPx: number,
    startAdj: StoryAdjust,
    startCs: PageCoordinateSystem,
  ) => {
    const { story, sheet, baseSheet, displayScale } = latest.current;
    if (!story || !sheet || !baseSheet) return;

    const scale = Math.max(displayScale, 0.0001);
    const state = store.getState();

    const base = baseFrameForSheet(
      state.pageCoordinate.pages,
      state.pageCoordinate.sheets,
      baseSheet,
      state.story.stories,
    );

    const fromAtStart = { cs: startCs, adj: startAdj };

    const anchor = {
      x: sheet.crop.x + sheet.crop.width / 2,
      y: sheet.crop.y + sheet.crop.height / 2,
    };

    const where = storyPointToBasePage(anchor, fromAtStart, base);

    const next = adjustToPlace(
      anchor,
      { x: where.x + dxPx / scale, y: where.y + dyPx / scale },
      fromAtStart,
      base,
    );

    const folded = foldAdjustIntoOrigin(startCs, next);

    dispatch(
      moveSheetOrigin({
        sheetId: story.sheetId,
        x: folded.origin.x,
        y: folded.origin.y,
      }),
    );
    dispatch(updateStoryAdjust({ id: story.id, changes: folded.adjust }));
  };

  useEffect(() => {
    if (!alignStoryId) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      if (event.code === 'Space') spaceDown.current = true;

      if (event.key === 'Escape' || event.key === 'Enter') {
        event.preventDefault();
        dispatch(setAlignStory(null));
        return;
      }

      const step = event.shiftKey ? 10 : event.altKey ? 0.25 : 1;
      const arrows: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };

      const move = arrows[event.key];
      const current = latest.current.story;
      const cs = currentCs();

      if (move && current && cs) {
        event.preventDefault();
        // Stop the viewer's own ← / → page-switching shortcut.
        event.stopPropagation();
        moveBy(move[0], move[1], current.adjust, cs);
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') spaceDown.current = false;
    };

    // Capture phase so the page-navigation arrow shortcuts don't also fire.
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alignStoryId]);

  // Drag deltas are measured in the base canvas's page coordinates, so always
  // leave alignment mode if the user switches away from the designated base.
  useEffect(() => {
    if (alignStoryId && (!story || !baseSheet || story.sheetId === baseSheet.id || activeSheet?.id !== baseSheet.id)) {
      dispatch(setAlignStory(null));
    }
  }, [alignStoryId, story, baseSheet, activeSheet?.id, dispatch]);

  if (!story || !sheet || !baseSheet || story.sheetId === baseSheet.id || activeSheet?.id !== baseSheet.id) {
    return null;
  }

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || spaceDown.current) return; // let pan through
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const startCs = currentCs();
    if (!startCs) return;

    drag.current = {
      startX: event.clientX,
      startY: event.clientY,
      startAdj: { ...story.adjust },
      startCs,
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state) return;

    moveBy(
      event.clientX - state.startX,
      event.clientY - state.startY,
      state.startAdj,
      state.startCs,
    );
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    drag.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div
      className="absolute inset-0 z-[45] cursor-move touch-none"
      style={{ outline: `2px dashed ${story.tint}`, outlineOffset: -2 }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onContextMenu={(event) => {
        event.preventDefault();
        dispatch(setAlignStory(null));
      }}
    >
      <div
        className="absolute left-2 top-2 flex items-center gap-2 rounded-md border bg-white/95 px-2 py-1.5 text-[11px] shadow-md"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <span
          className="h-3 w-3 shrink-0 rounded-full border"
          style={{ background: story.tint }}
        />

        <div className="leading-tight">
          <div className="font-medium">Aligning: {story.name}</div>
          <div className="text-[10px] text-muted-foreground">
            Move this sheet until it sits right against the shared origin.
          </div>
          <div className="text-[10px] text-muted-foreground">
            Drag · arrows nudge (Shift ×10, Alt fine) · Esc to finish
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          title="Centre on base plan"
          onClick={() => centreUnderlayOnBase(story.id)}
        >
          <Crosshair className="h-3 w-3" />
        </Button>

        <Button
          size="sm"
          className="h-6 px-2 text-[10px]"
          onClick={() => dispatch(setAlignStory(null))}
        >
          <Check className="mr-1 h-3 w-3" />
          Done
        </Button>
      </div>
    </div>
  );
}

// src/features/stories/StoryAlignOverlay.tsx
//
// Interactive alignment of an underlay plan against the base Plan Sheet.
// While active, a transparent layer captures the pointer: dragging moves the
// underlay, arrow keys nudge it (Shift = x10, Alt = fine), Enter / Esc
// finishes. The result is stored as the story's adjust.dxMm / dyMm, so it is
// exact in engineering millimetres and survives zoom changes.

import { useEffect, useRef } from 'react';
import { Check, Crosshair, RotateCcw } from 'lucide-react';

import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { selectActivePlanSheet } from '@/app/store/slices/planSheetSlice';
import {
  resetStoryAdjust,
  setAlignStory,
  updateStoryAdjust,
  type StoryAdjust,
} from '@/app/store/slices/storySlice';
import {
  adjustToPlace,
  baseFrameForSheet,
  frameForStory,
  planSheetForStory,
  storyPointToBasePage,
} from '@/core/coordinate/storyTransform';
import { Button } from '@/components/ui/button';
import { centreUnderlayOnBase } from './underlayActions';

interface DragState {
  startX: number;
  startY: number;
  startAdj: StoryAdjust;
}

export function StoryAlignOverlay() {
  const dispatch = useAppDispatch();

  const alignStoryId = useAppSelector((state) => state.story.alignStoryId);
  const stories = useAppSelector((state) => state.story.stories);
  const planSheets = useAppSelector((state) => state.planSheet.sheets);
  const baseSheet = useAppSelector(selectActivePlanSheet);
  const pageSystems = useAppSelector((state) => state.pageCoordinate.pages);
  const sheetSystems = useAppSelector((state) => state.pageCoordinate.sheets);
  const displayScale = useAppSelector((state) => state.pdf.scale);

  const story = stories.find((item) => item.id === alignStoryId) ?? null;
  const sheet = story ? planSheetForStory(story, planSheets) : null;

  const drag = useRef<DragState | null>(null);
  const spaceDown = useRef(false);

  // Always read the latest values inside long-lived listeners.
  const latest = useRef({ story, sheet, baseSheet, displayScale });
  latest.current = { story, sheet, baseSheet, displayScale };

  /**
   * Move the underlay so that it ends up `delta` (screen px) away from where
   * it was when `startAdj` was in force.
   */
  const moveBy = (
    dxPx: number,
    dyPx: number,
    startAdj: StoryAdjust,
  ) => {
    const { story, sheet, baseSheet, displayScale } = latest.current;
    if (!story || !sheet || !baseSheet) return;

    const scale = Math.max(displayScale, 0.0001);

    const base = baseFrameForSheet(
      pageSystems,
      sheetSystems,
      baseSheet,
      stories,
    );

    const from = frameForStory(pageSystems, sheetSystems, story, planSheets);
    const fromAtStart = { cs: from.cs, adj: startAdj };

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

    dispatch(updateStoryAdjust({ id: story.id, changes: next }));
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

      if (move && current) {
        event.preventDefault();
        // Stop the viewer's own ← / → page-switching shortcut.
        event.stopPropagation();
        moveBy(move[0], move[1], current.adjust);
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
  }, [alignStoryId, pageSystems, sheetSystems, stories, planSheets]);

  // Leave align mode when the base sheet changes or the story disappears.
  useEffect(() => {
    if (alignStoryId && (!story || !baseSheet || story.sheetId === baseSheet.id)) {
      dispatch(setAlignStory(null));
    }
  }, [alignStoryId, story, baseSheet, dispatch]);

  if (!story || !sheet || !baseSheet || story.sheetId === baseSheet.id) {
    return null;
  }

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || spaceDown.current) return; // let pan through
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    drag.current = {
      startX: event.clientX,
      startY: event.clientY,
      startAdj: { ...story.adjust },
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state) return;

    moveBy(
      event.clientX - state.startX,
      event.clientY - state.startY,
      state.startAdj,
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
          <div className="font-mono text-[10px] text-muted-foreground">
            dx {story.adjust.dxMm.toFixed(0)} mm · dy{' '}
            {story.adjust.dyMm.toFixed(0)} mm
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
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          title="Reset translation"
          onClick={() => dispatch(resetStoryAdjust(story.id))}
        >
          <RotateCcw className="h-3 w-3" />
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

// src/features/plan-sheets/UnderlayControls.tsx
//
// Per-Plan-Sheet alignment controls. Every sheet except the base sheet is a
// "super-sheet": it is shown as a transparent underlay of the sheet being
// edited and is translated until it sits right against the shared origin that
// was set on the base sheet.

import { Layers, Lock, Move, Unlock } from 'lucide-react';

import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import {
  setAlignStory,
  setStoryAlignmentLocked,
  updateStory,
} from '@/app/store/slices/storySlice';
import { setCurrentPage } from '@/app/store/slices/pdfSlice';
import { selectBasePlanSheet, setActivePlanSheet } from '@/app/store/slices/planSheetSlice';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  addSheetAsUnderlay,
  startAligningSheet,
} from '@/features/stories/underlayActions';
import type { PlanSheet } from './planSheetTypes';

export function UnderlayControls({ sheet }: { sheet: PlanSheet }) {
  const dispatch = useAppDispatch();

  const story = useAppSelector((state) =>
    state.story.stories.find((item) => item.sheetId === sheet.id),
  );
  const baseSheet = useAppSelector(selectBasePlanSheet);
  const isBase = baseSheet?.id === sheet.id;
  const aligning = useAppSelector(
    (state) => !!story && state.story.alignStoryId === story.id,
  );

  const on = !!story?.overlayVisible;
  const opacity = Math.round((story?.overlayOpacity ?? 0.4) * 100);
  const locked = !!story?.alignmentLocked;

  const toggle = (value: boolean) => {
    if (!baseSheet) return;
    if (!story) {
      if (value) addSheetAsUnderlay(sheet);
      return;
    }

    if (!value && aligning) dispatch(setAlignStory(null));
    dispatch(updateStory({ id: story.id, changes: { overlayVisible: value } }));
  };

  const alignToBase = () => {
    if (!baseSheet || isBase || locked) return;
    if (aligning) {
      dispatch(setAlignStory(null));
      return;
    }

    // The alignment canvas uses the base floor's page coordinates. Activate it
    // before entering drag mode, without changing which sheet is the base.
    dispatch(setCurrentPage(baseSheet.sourcePage));
    dispatch(setActivePlanSheet(baseSheet.id));
    startAligningSheet(sheet);
  };

  return (
    <div className="mt-1.5 space-y-1.5 border-t border-gray-100 pt-1.5">
      <div className="flex items-center gap-2">
        <Layers className="h-3 w-3 shrink-0 text-muted-foreground" />

        <Switch
          checked={on}
          onCheckedChange={toggle}
          disabled={!baseSheet}
          title="Show this sheet as a transparent overlay on the sheet being edited"
        />

        <Slider
          className="flex-1"
          min={0}
          max={100}
          step={5}
          disabled={!story || !baseSheet}
          value={[opacity]}
          onValueChange={([value]) =>
            story &&
            dispatch(
              updateStory({
                id: story.id,
                changes: { overlayOpacity: value / 100 },
              }),
            )
          }
        />

        <span className="w-8 text-right text-[10px] text-muted-foreground">
          {opacity}%
        </span>

        <Button
          variant={aligning ? 'default' : 'ghost'}
          size="icon"
          className="h-6 w-6"
          title={
            locked
              ? 'Unlock this sheet to align it again'
              : 'Translate this sheet on the base sheet until it is in the right position'
          }
          disabled={!baseSheet || isBase || locked}
          onClick={alignToBase}
        >
          <Move className="h-3 w-3" />
        </Button>

        <Button
          variant={locked ? 'default' : 'ghost'}
          size="icon"
          className="h-6 w-6"
          title={locked ? 'Unlock alignment' : 'Lock alignment once the sheet is in position'}
          disabled={!story}
          onClick={() =>
            story &&
            dispatch(setStoryAlignmentLocked({ id: story.id, locked: !locked }))
          }
        >
          {locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
        </Button>
      </div>

      {story && (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <input
            type="color"
            value={story.tint}
            onChange={(event) =>
              dispatch(updateStory({ id: story.id, changes: { tint: event.target.value } }))
            }
            className="h-4 w-4 shrink-0 cursor-pointer rounded border border-gray-200 p-0"
            title="Overlay colour"
          />
          <label className="flex items-center gap-1.5">
            <Switch
              checked={story.showGhostElements}
              onCheckedChange={(value) =>
                dispatch(updateStory({ id: story.id, changes: { showGhostElements: value } }))
              }
            />
            Show its members
          </label>
        </div>
      )}
    </div>
  );
}

// src/features/plan-sheets/UnderlayControls.tsx
//
// Per-Plan-Sheet underlay controls: toggle the sheet as an underlay of the
// active base sheet, set its opacity, and drag it into alignment.

import { Layers, Move } from 'lucide-react';

import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import {
  setAlignStory,
  updateStory,
} from '@/app/store/slices/storySlice';
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
  const aligning = useAppSelector(
    (state) => !!story && state.story.alignStoryId === story.id,
  );

  const on = !!story?.overlayVisible;
  const opacity = Math.round((story?.overlayOpacity ?? 0.4) * 100);

  const toggle = (value: boolean) => {
    if (!story) {
      if (value) addSheetAsUnderlay(sheet);
      return;
    }

    if (!value && aligning) dispatch(setAlignStory(null));
    dispatch(updateStory({ id: story.id, changes: { overlayVisible: value } }));
  };

  return (
    <div className="mt-1.5 flex items-center gap-2 border-t border-gray-100 pt-1.5">
      <Layers className="h-3 w-3 shrink-0 text-muted-foreground" />

      <Switch
        checked={on}
        onCheckedChange={toggle}
        title="Underlay this plan beneath the active plan"
      />

      <Slider
        className="flex-1"
        min={0}
        max={100}
        step={5}
        disabled={!story}
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
        title="Drag to align with the active plan"
        onClick={() =>
          aligning
            ? dispatch(setAlignStory(null))
            : startAligningSheet(sheet)
        }
      >
        <Move className="h-3 w-3" />
      </Button>
    </div>
  );
}

// src/features/stories/StoryPanel.tsx

import { useMemo } from 'react';
import { toast } from 'sonner';
import {
  Download,
  Layers3,
  Link2,
  Magnet,
  Trash2,
  Eye,
  EyeOff,
  Anchor,
  Move,
} from 'lucide-react';

import { store } from '@/app/store';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';

import { setCurrentPage } from '@/app/store/slices/pdfSlice';
import { ensureSheet } from '@/app/store/slices/pageCoordinateSlice';
import {
  beginHistoryTransaction,
  endHistoryTransaction,
  updateShape,
} from '@/app/store/slices/drawingSlice';

import {
  initStoriesFromPlanSheets,
  removeStory,
  resetStoryAdjust,
  setAlignStory,
  setAllOverlays,
  setGhostSnap,
  setLinkToleranceMm,
  setPullRadiusMm,
  setShowLinks,
  updateStory,
  updateStoryAdjust,
  type Story,
} from '@/app/store/slices/storySlice';

import {
  selectActivePlanSheet,
  selectPlanSheets,
  setActivePlanSheet,
} from '@/app/store/slices/planSheetSlice';

import {
  basePageToStoryPoint,
  frameForStory,
  sourcePageForStory,
} from '@/core/coordinate/storyTransform';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

import {
  nodesOfStory,
  pairNodes,
  summarizeLevels,
} from './storyLinks';
import { buildStoryModel } from './storyModel';

function NumberField({
  label,
  value,
  onCommit,
  step = 1,
  width = 'w-16',
}: {
  label: string;
  value: number;
  onCommit: (value: number) => void;
  step?: number;
  width?: string;
}) {
  return (
    <label className="flex items-center gap-1 text-[10px] text-gray-500">
      {label}
      <Input
        key={value}
        type="number"
        step={step}
        defaultValue={value}
        className={`h-6 ${width} px-1 text-xs`}
        onBlur={(event) => {
          const value = Number(event.target.value);
          if (Number.isFinite(value) && value !== undefined) {
            onCommit(value);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            (event.target as HTMLInputElement).blur();
          }
        }}
      />
    </label>
  );
}

function StoryRow({
  story,
  isBase,
  sourcePage,
  unscaled,
}: {
  story: Story;
  isBase: boolean;
  sourcePage: number;
  unscaled: boolean;
}) {
  const dispatch = useAppDispatch();

  const aligning = useAppSelector(
    (state) => state.story.alignStoryId === story.id,
  );

  const patch = (
    changes: Partial<Omit<Story, 'id' | 'adjust'>>,
  ) => {
    dispatch(
      updateStory({
        id: story.id,
        changes,
      }),
    );
  };

  const adjust = (
    changes: Partial<Story['adjust']>,
  ) => {
    dispatch(
      updateStoryAdjust({
        id: story.id,
        changes,
      }),
    );
  };

  return (
    <div
      className={`space-y-1.5 rounded-md border p-2 ${isBase
        ? 'border-primary/40 bg-primary/5'
        : 'border-gray-200'}`}
    >
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={story.tint}
          onChange={(event) =>
            patch({ tint: event.target.value })
          }
          className="h-5 w-5 shrink-0 cursor-pointer rounded border border-gray-200 p-0"
          title="Overlay colour"
        />

        <Input
          key={story.name}
          defaultValue={story.name}
          className="h-6 flex-1 px-1 text-xs font-medium"
          onBlur={(event) => {
            const value = event.target.value.trim();
            if (value) patch({ name: value });
          }}
        />

        <span className="shrink-0 rounded-full bg-gray-200 px-1.5 py-0.5 font-mono text-[9px] text-gray-600">
          p.{sourcePage}
        </span>

        <Button
          variant={isBase ? 'default' : 'outline'}
          size="sm"
          className="h-6 px-2 text-[10px]"
          title="Make this level the active modelling sheet"
          onClick={() => {
            dispatch(setCurrentPage(sourcePage));
            dispatch(setActivePlanSheet(story.sheetId));
          }}
        >
          {isBase ? 'Base' : 'Edit'}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-red-500"
          onClick={() => dispatch(removeStory(story.id))}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {isBase ? (
        <p className="text-[10px] text-gray-500">
          Active level - all other visible structural levels overlay on this Plan Sheet.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Switch
              checked={story.overlayVisible}
              onCheckedChange={(value) =>
                patch({ overlayVisible: value })
              }
            />
            <span className="w-6 text-[10px] text-gray-500">
              {story.overlayVisible ? 'On' : 'Off'}
            </span>

            <Slider
              className="flex-1"
              min={0}
              max={100}
              step={5}
              value={[
                Math.round(story.overlayOpacity * 100),
              ]}
              onValueChange={([value]) =>
                patch({ overlayOpacity: value / 100 })
              }
            />

            <span className="w-8 text-right text-[10px] text-gray-500">
              {Math.round(story.overlayOpacity * 100)}%
            </span>

            <Button
              variant={aligning ? 'default' : 'outline'}
              size="icon"
              className="h-6 w-6"
              title="Drag this plan on the canvas to align it with the base plan"
              onClick={() =>
                dispatch(setAlignStory(aligning ? null : story.id))
              }
            >
              <Move className="h-3 w-3" />
            </Button>
          </div>

          <label className="flex items-center gap-2 text-[10px] text-gray-500">
            <Switch
              checked={story.showGhostElements}
              onCheckedChange={(value) =>
                patch({ showGhostElements: value })
              }
            />
            Show this level's modelled elements
          </label>
        </>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <NumberField
          label="Elev. (mm)"
          width="w-20"
          value={story.elevationMm}
          step={100}
          onCommit={(value) =>
            patch({ elevationMm: value })
          }
        />

        {!isBase && (
          <details className="text-[10px] text-gray-500">
            <summary className="cursor-pointer select-none">
              Align (numeric)
            </summary>

            <div className="mt-1 flex flex-wrap gap-2">
              <NumberField
                label="dx"
                value={story.adjust.dxMm}
                step={10}
                onCommit={(value) =>
                  adjust({ dxMm: value })
                }
              />

              <NumberField
                label="dy"
                value={story.adjust.dyMm}
                step={10}
                onCommit={(value) =>
                  adjust({ dyMm: value })
                }
              />

              <NumberField
                label="rot°"
                value={story.adjust.rotationDeg}
                step={0.1}
                onCommit={(value) =>
                  adjust({ rotationDeg: value })
                }
              />

              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => dispatch(resetStoryAdjust(story.id))}
              >
                Reset
              </Button>
            </div>
          </details>
        )}
      </div>

      {unscaled && (
        <p className="text-[10px] text-amber-600">
          This Plan Sheet has no drawing scale/origin set yet. The default 1:100 coordinate system is being used.
        </p>
      )}
    </div>
  );
}

export function StoryPanel() {
  const dispatch = useAppDispatch();

  const stories = useAppSelector((state) => state.story.stories);
  const planSheets = useAppSelector(selectPlanSheets);
  const activeSheet = useAppSelector(selectActivePlanSheet);
  const currentSheetId = activeSheet?.id ?? null;

  const toleranceMm = useAppSelector(
    (state) => state.story.linkToleranceMm,
  );
  const pullRadiusMm = useAppSelector(
    (state) => state.story.pullRadiusMm,
  );
  const showLinks = useAppSelector(
    (state) => state.story.showLinks,
  );
  const ghostSnap = useAppSelector(
    (state) => state.story.ghostSnap,
  );

  const pageSystems = useAppSelector(
    (state) => state.pageCoordinate.pages,
  );
  const sheetSystems = useAppSelector(
    (state) => state.pageCoordinate.sheets,
  );
  const shapes = useAppSelector(
    (state) => state.drawing.shapes,
  );

  const levels = useMemo(
    () =>
      summarizeLevels(
        shapes,
        stories,
        pageSystems,
        sheetSystems,
        planSheets,
        toleranceMm,
      ),
    [
      shapes,
      stories,
      pageSystems,
      sheetSystems,
      planSheets,
      toleranceMm,
    ],
  );

  const ordered = useMemo(
    () =>
      [...stories].sort(
        (a, b) => b.elevationMm - a.elevationMm,
      ),
    [stories],
  );

  const orderedSheets = useMemo(
    () =>
      [...planSheets].sort(
        (a, b) =>
          a.createdAt.localeCompare(b.createdAt),
      ),
    [planSheets],
  );

  const pullNodes = () => {
    const state = store.getState();

    const baseStory = state.story.stories.find(
      (story) =>
        story.sheetId ===
        state.planSheet.activeSheetId,
    );

    if (!baseStory) {
      toast.error('Create a Story from the active Plan Sheet first.');
      return;
    }

    const baseFrame = frameForStory(
      state.pageCoordinate.pages,
      state.pageCoordinate.sheets,
      baseStory,
      state.planSheet.sheets,
    );

    const baseNodes = nodesOfStory(
      state.drawing.shapes,
      baseStory,
      state.pageCoordinate.pages,
      state.pageCoordinate.sheets,
      state.planSheet.sheets,
    );

    let moved = 0;

    dispatch(beginHistoryTransaction());

    for (const otherStory of state.story.stories) {
      if (otherStory.sheetId === baseStory.sheetId) continue;

      const otherFrame = frameForStory(
        state.pageCoordinate.pages,
        state.pageCoordinate.sheets,
        otherStory,
        state.planSheet.sheets,
      );

      const pairs = pairNodes(
        baseNodes,
        nodesOfStory(
          state.drawing.shapes,
          otherStory,
          state.pageCoordinate.pages,
          state.pageCoordinate.sheets,
          state.planSheet.sheets,
        ),
        state.story.pullRadiusMm,
      );

      for (const pair of pairs) {
        if (pair.distMm < 0.01) continue;

        const target = basePageToStoryPoint(
          pair.a.page,
          otherFrame,
          baseFrame,
        );

        const node = state.drawing.shapes.find(
          (shape) => shape.id === pair.b.id,
        );

        if (!node || !('geometry' in node)) continue;

        dispatch(
          updateShape({
            id: node.id,
            changes: {
              geometry: {
                ...(node.geometry as object),
                x: target.x,
                y: target.y,
              },
            } as never,
          }),
        );

        moved += 1;
      }
    }

    dispatch(endHistoryTransaction());

    toast.success(
      moved
        ? `Aligned ${moved} node(s) of other levels onto this level.`
        : 'No nodes needed moving.',
    );
  };

  const exportModel = () => {
    const model = buildStoryModel(store.getState());

    if (!model.stories.length) {
      toast.error('Create stories first.');
      return;
    }

    const blob = new Blob(
      [JSON.stringify(model, null, 2)],
      { type: 'application/json' },
    );

    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = 'structural-model-3d.json';
    anchor.click();
    URL.revokeObjectURL(url);

    toast.success(
      `Exported ${model.nodes.length} nodes, ${model.elements.length} elements, ${model.verticalMembers.length} vertical members.`,
    );
  };

  const initialiseStories = () => {
    dispatch(
      initStoriesFromPlanSheets({
        sheets: orderedSheets.filter(
          (sheet) => sheet.role === 'structural',
        ),
      }),
    );

    for (const sheet of orderedSheets) {
      if (sheet.role === 'structural') {
        dispatch(
          ensureSheet({
            sheetId: sheet.id,
            pageIndex: sheet.sourcePage,
          }),
        );
      }
    }
  };

  return (
    <div className="mb-2 rounded-md border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 p-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Layers3 className="h-3.5 w-3.5" />
          Stories / Levels
        </h3>

        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-[10px]"
            disabled={!orderedSheets.some((sheet) => sheet.role === 'structural')}
            onClick={initialiseStories}
          >
            From Plan Sheets
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="Show all overlays"
            onClick={() =>
              dispatch(setAllOverlays(true))
            }
          >
            <Eye className="h-3 w-3" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="Hide all overlays"
            onClick={() =>
              dispatch(setAllOverlays(false))
            }
          >
            <EyeOff className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="space-y-1.5 p-2">
        {ordered.length === 0 && (
          <p className="text-xs text-gray-500">
            Create structural Plan Sheets first, then use
            "From Plan Sheets" to turn them into Stories / Levels.
          </p>
        )}

        {ordered.map((story) => {
          const sourcePage = sourcePageForStory(
            story,
            planSheets,
          );

          const coordinate =
            sheetSystems[story.sheetId] ??
            pageSystems[sourcePage];

          const unscaled =
            !coordinate ||
            (coordinate.origin.x === 0 &&
              coordinate.origin.y === 0);

          return (
            <StoryRow
              key={story.id}
              story={story}
              sourcePage={sourcePage}
              isBase={
                story.sheetId === currentSheetId
              }
              unscaled={unscaled}
            />
          );
        })}
      </div>

      {stories.length > 0 && (
        <div className="space-y-2 border-t border-gray-100 bg-gray-50/40 p-2">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <Link2 className="h-3 w-3" />
              Show vertical links
            </span>
            <Switch
              checked={showLinks}
              onCheckedChange={(value) =>
                dispatch(setShowLinks(value))
              }
            />
          </div>

          <div className="flex items-center justify-between text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <Magnet className="h-3 w-3" />
              Snap to other levels
            </span>
            <Switch
              checked={ghostSnap}
              onCheckedChange={(value) =>
                dispatch(setGhostSnap(value))
              }
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <NumberField
              label="Link tol. (mm)"
              width="w-16"
              value={toleranceMm}
              step={10}
              onCommit={(value) =>
                dispatch(setLinkToleranceMm(value))
              }
            />

            <NumberField
              label="Pull radius (mm)"
              width="w-16"
              value={pullRadiusMm}
              step={50}
              onCommit={(value) =>
                dispatch(setPullRadiusMm(value))
              }
            />
          </div>

          {levels.length > 0 && (
            <ul className="space-y-0.5 text-[11px] text-gray-600">
              {levels.map((level) => (
                <li
                  key={
                    level.lowerStory.id +
                    level.upperStory.id
                  }
                >
                  <span className="font-medium">
                    {level.lowerStory.name} -{' '}
                    {level.upperStory.name}:
                  </span>{' '}
                  <span className="text-green-600">
                    {level.links.length} linked
                  </span>

                  {(level.unlinkedLower > 0 ||
                    level.unlinkedUpper > 0) && (
                    <span className="text-orange-600">
                      {' '}
                      / {level.unlinkedLower} +{' '}
                      {level.unlinkedUpper} unlinked
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 flex-1 text-[11px]"
              onClick={pullNodes}
              title="Move nodes of other levels onto the active level's nodes"
            >
              <Anchor className="mr-1 h-3 w-3" />
              Pull nodes to this level
            </Button>

            <Button
              size="sm"
              className="h-7 flex-1 text-[11px]"
              onClick={exportModel}
            >
              <Download className="mr-1 h-3 w-3" />
              Export 3D model
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

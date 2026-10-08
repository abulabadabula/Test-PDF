// src/features/stories/StoryPanel.tsx
import { useMemo } from 'react';
import { toast } from 'sonner';
import { Download, Layers3, Link2, Magnet, Trash2, Eye, EyeOff, Anchor } from 'lucide-react';
import { store } from '@/app/store';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { setCurrentPage } from '@/app/store/slices/pdfSlice';
import { ensurePage } from '@/app/store/slices/pageCoordinateSlice';
import {
  beginHistoryTransaction, endHistoryTransaction, updateShape,
} from '@/app/store/slices/drawingSlice';
import {
  initStoriesFromPages, removeStory, setAllOverlays, setGhostSnap, setLinkToleranceMm,
  setPullRadiusMm, setShowLinks, updateStory, updateStoryAdjust, type Story,
} from '@/app/store/slices/storySlice';
import { basePageToStoryPoint, frameOf } from '@/core/coordinate/storyTransform';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { nodesOfStory, pairNodes, summarizeLevels } from './storyLinks';
import { buildStoryModel } from './storyModel';

function NumberField({
  label, value, onCommit, step = 1, width = 'w-16',
}: { label: string; value: number; onCommit: (v: number) => void; step?: number; width?: string }) {
  return (
    <label className="flex items-center gap-1 text-[10px] text-gray-500">
      {label}
      <Input
        key={value}
        type="number"
        step={step}
        defaultValue={value}
        className={`h-6 ${width} px-1 text-xs`}
        onBlur={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v) && v !== value) onCommit(v);
        }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      />
    </label>
  );
}

function StoryRow({ story, isBase, unscaled }: { story: Story; isBase: boolean; unscaled: boolean }) {
  const dispatch = useAppDispatch();
  const patch = (changes: Partial<Omit<Story, 'id' | 'adjust'>>) => dispatch(updateStory({ id: story.id, changes }));
  const adjust = (changes: Partial<Story['adjust']>) => dispatch(updateStoryAdjust({ id: story.id, changes }));

  return (
    <div className={`rounded-md border p-2 space-y-1.5 ${isBase ? 'border-primary/40 bg-primary/5' : 'border-gray-200'}`}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={story.tint}
          onChange={(e) => patch({ tint: e.target.value })}
          className="h-5 w-5 shrink-0 cursor-pointer rounded border border-gray-200 p-0"
          title="Overlay colour"
        />
        <Input
          key={story.name}
          defaultValue={story.name}
          className="h-6 flex-1 px-1 text-xs font-medium"
          onBlur={(e) => e.target.value.trim() && patch({ name: e.target.value.trim() })}
        />
        <span className="shrink-0 rounded-full bg-gray-200 px-1.5 text-[10px] text-gray-600">p.{story.pageIndex}</span>
        <Button
          variant={isBase ? 'default' : 'outline'}
          size="sm"
          className="h-6 px-2 text-[10px]"
          title="Edit this level (make it the base plan)"
          onClick={() => dispatch(setCurrentPage(story.pageIndex))}
        >
          {isBase ? 'Base' : 'Edit'}
        </Button>
        <Button
          variant="ghost" size="icon" className="h-6 w-6 text-red-500"
          onClick={() => dispatch(removeStory(story.id))}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {isBase ? (
        <p className="text-[10px] text-gray-500">Active level - all other visible levels overlay on this plan.</p>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Switch
              checked={story.overlayVisible}
              onCheckedChange={(v) => patch({ overlayVisible: v })}
            />
            <span className="w-6 text-[10px] text-gray-500">{story.overlayVisible ? 'On' : 'Off'}</span>
            <Slider
              className="flex-1"
              min={5} max={100} step={5}
              value={[Math.round(story.overlayOpacity * 100)]}
              onValueChange={([v]) => patch({ overlayOpacity: v / 100 })}
            />
            <span className="w-8 text-right text-[10px] text-gray-500">{Math.round(story.overlayOpacity * 100)}%</span>
          </div>
          <label className="flex items-center gap-2 text-[10px] text-gray-500">
            <Switch checked={story.showGhostElements} onCheckedChange={(v) => patch({ showGhostElements: v })} />
            Show this level's modelled elements
          </label>
        </>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <NumberField label="Elev. (mm)" width="w-20" value={story.elevationMm} step={100}
          onCommit={(v) => patch({ elevationMm: v })} />
        {!isBase && (
          <details className="text-[10px] text-gray-500">
            <summary className="cursor-pointer select-none">Align</summary>
            <div className="mt-1 flex flex-wrap gap-2">
              <NumberField label="dx" value={story.adjust.dxMm} step={10} onCommit={(v) => adjust({ dxMm: v })} />
              <NumberField label="dy" value={story.adjust.dyMm} step={10} onCommit={(v) => adjust({ dyMm: v })} />
              <NumberField label="rot°" value={story.adjust.rotationDeg} step={0.1}
                onCommit={(v) => adjust({ rotationDeg: v })} />
            </div>
          </details>
        )}
      </div>

      {unscaled && (
        <p className="text-[10px] text-amber-600">
          Page {story.pageIndex} has no origin/scale set yet (default 1:100 is used). Open the page and set its
          origin on the same grid point as the base plan.
        </p>
      )}
    </div>
  );
}

export function StoryPanel() {
  const dispatch = useAppDispatch();
  const stories = useAppSelector((s) => s.story.stories);
  const toleranceMm = useAppSelector((s) => s.story.linkToleranceMm);
  const pullRadiusMm = useAppSelector((s) => s.story.pullRadiusMm);
  const showLinks = useAppSelector((s) => s.story.showLinks);
  const ghostSnap = useAppSelector((s) => s.story.ghostSnap);
  const totalPages = useAppSelector((s) => s.pdf.totalPages);
  const currentPage = useAppSelector((s) => s.pdf.currentPage);
  const pages = useAppSelector((s) => s.pageCoordinate.pages);
  const shapes = useAppSelector((s) => s.drawing.shapes);

  const levels = useMemo(
    () => summarizeLevels(shapes, stories, pages, toleranceMm),
    [shapes, stories, pages, toleranceMm],
  );

  const ordered = useMemo(() => [...stories].sort((a, b) => b.elevationMm - a.elevationMm), [stories]);

  const pullNodes = () => {
    const state = store.getState();
    const base = state.story.stories.find((s) => s.pageIndex === state.pdf.currentPage);
    if (!base) { toast.error('The current page is not a story yet.'); return; }
    const pg = state.pageCoordinate.pages;
    const baseFrame = frameOf(pg, base.pageIndex, base.adjust);
    const baseNodes = nodesOfStory(state.drawing.shapes, base, pg);

    let moved = 0;
    dispatch(beginHistoryTransaction());
    for (const other of state.story.stories) {
      if (other.pageIndex === base.pageIndex) continue;
      const otherFrame = frameOf(pg, other.pageIndex, other.adjust);
      const pairs = pairNodes(baseNodes, nodesOfStory(state.drawing.shapes, other, pg), state.story.pullRadiusMm);
      for (const pair of pairs) {
        if (pair.distMm < 0.01) continue;
        // target = base node's position expressed in the other story's page coordinates
        const target = basePageToStoryPoint(pair.a.page, otherFrame, baseFrame);
        const node = state.drawing.shapes.find((s) => s.id === pair.b.id);
        if (!node || !('geometry' in node)) continue;
        dispatch(updateShape({
          id: node.id,
          changes: { geometry: { ...(node.geometry as object), x: target.x, y: target.y } } as never,
        }));
        moved += 1;
      }
    }
    dispatch(endHistoryTransaction());
    toast.success(moved ? `Aligned ${moved} node(s) of other levels onto this level.` : 'No nodes needed moving.');
  };

  const exportModel = () => {
    const model = buildStoryModel(store.getState());
    if (!model.stories.length) { toast.error('Create stories first.'); return; }
    const blob = new Blob([JSON.stringify(model, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = 'structural-model-3d.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${model.nodes.length} nodes, ${model.elements.length} elements, ${model.verticalMembers.length} vertical members.`);
  };

  return (
    <div className="mb-2 rounded-md border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 p-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold"><Layers3 className="h-3.5 w-3.5" /> Stories / Levels</h3>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="h-6 px-2 text-[10px]"
            disabled={totalPages === 0}
            onClick={() => {
              dispatch(initStoriesFromPages({ pageCount: totalPages }));
              for (let p = 1; p <= totalPages; p += 1) dispatch(ensurePage({ pageIndex: p }));
            }}>
            From PDF pages
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" title="Show all overlays"
            onClick={() => dispatch(setAllOverlays(true))}><Eye className="h-3 w-3" /></Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" title="Hide all overlays"
            onClick={() => dispatch(setAllOverlays(false))}><EyeOff className="h-3 w-3" /></Button>
        </div>
      </div>

      <div className="space-y-1.5 p-2">
        {ordered.length === 0 && (
          <p className="text-xs text-gray-500">
            Load a multi-page PDF and press "From PDF pages" - each page becomes a level you can overlay,
            toggle and tie together vertically.
          </p>
        )}
        {ordered.map((story) => {
          const cs = pages[story.pageIndex];
          const unscaled = !cs || (cs.origin.x === 0 && cs.origin.y === 0);
          return <StoryRow key={story.id} story={story} isBase={story.pageIndex === currentPage} unscaled={unscaled} />;
        })}
      </div>

      {stories.length > 0 && (
        <div className="space-y-2 border-t border-gray-100 bg-gray-50/40 p-2">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span className="flex items-center gap-1"><Link2 className="h-3 w-3" /> Show vertical links</span>
            <Switch checked={showLinks} onCheckedChange={(v) => dispatch(setShowLinks(v))} />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span className="flex items-center gap-1"><Magnet className="h-3 w-3" /> Snap to other levels</span>
            <Switch checked={ghostSnap} onCheckedChange={(v) => dispatch(setGhostSnap(v))} />
          </div>
          <div className="flex flex-wrap gap-3">
            <NumberField label="Link tol. (mm)" width="w-16" value={toleranceMm} step={10}
              onCommit={(v) => dispatch(setLinkToleranceMm(v))} />
            <NumberField label="Pull radius (mm)" width="w-16" value={pullRadiusMm} step={50}
              onCommit={(v) => dispatch(setPullRadiusMm(v))} />
          </div>

          {levels.length > 0 && (
            <ul className="space-y-0.5 text-[11px] text-gray-600">
              {levels.map((lv) => (
                <li key={lv.lowerStory.id + lv.upperStory.id}>
                  <span className="font-medium">{lv.lowerStory.name} - {lv.upperStory.name}:</span>{' '}
                  <span className="text-green-600">{lv.links.length} linked</span>
                  {(lv.unlinkedLower > 0 || lv.unlinkedUpper > 0) && (
                    <span className="text-orange-600"> / {lv.unlinkedLower} + {lv.unlinkedUpper} unlinked</span>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-7 flex-1 text-[11px]" onClick={pullNodes}
              title="Move nodes of other levels that lie within the pull radius exactly onto this level's nodes">
              <Anchor className="mr-1 h-3 w-3" /> Pull nodes to this level
            </Button>
            <Button size="sm" className="h-7 flex-1 text-[11px]" onClick={exportModel}>
              <Download className="mr-1 h-3 w-3" /> Export 3D model
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

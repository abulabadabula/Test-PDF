import { useMemo, useState } from 'react';
import { Check, Copy, Crosshair, Crop, Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import {
  activatePlanSheetForPage,
  beginCrop,
  duplicatePlanSheet,
  removePlanSheet,
  selectActivePlanSheet,
  selectBasePlanSheet,
  selectPlanSheets,
  setActivePlanSheet,
  setBasePlanSheet,
  updatePlanSheet,
} from '@/app/store/slices/planSheetSlice';
import { addStory, removeStory, updateStory, updateStoryAdjust } from '@/app/store/slices/storySlice';
import { setCurrentPage } from '@/app/store/slices/pdfSlice';
import { ensureSheet, setOriginMode } from '@/app/store/slices/pageCoordinateSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { storeysUsingSheet } from '@/features/storeys/storeyModel';
import { UnderlayControls } from './UnderlayControls';
import { toast } from 'sonner';

export function PlanSheetPanel() {
  const dispatch = useAppDispatch();
  const sheets = useAppSelector(selectPlanSheets);
  const active = useAppSelector(selectActivePlanSheet);
  const base = useAppSelector(selectBasePlanSheet);
  const stories = useAppSelector((state) => state.story.stories);
  const storeys = useAppSelector((state) => state.storey.storeys);
  const currentPage = useAppSelector((state) => state.pdf.currentPage);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const ordered = useMemo(
    () => [...sheets].sort((a, b) => {
      if (a.sourcePage !== b.sourcePage) return a.sourcePage - b.sourcePage;
      return a.createdAt.localeCompare(b.createdAt);
    }),
    [sheets],
  );

  const startRename = (id: string, value: string) => {
    setEditingId(id);
    setEditingName(value);
  };

  const commitRename = () => {
    if (!editingId) return;
    const value = editingName.trim();
    if (value) {
      dispatch(updatePlanSheet({
        id: editingId,
        changes: { name: value },
      }));
    }
    setEditingId(null);
  };

  const activate = (sheetId: string) => {
    const sheet = sheets.find((item) => item.id === sheetId);
    if (!sheet) return;

    dispatch(setCurrentPage(sheet.sourcePage));
    dispatch(setActivePlanSheet(sheet.id));
  };

  const setAsBase = (sheetId: string) => {
    const sheet = sheets.find((item) => item.id === sheetId);
    if (!sheet || sheet.role !== 'structural') return;

    // A structural Plan Sheet represents a floor in the model. Initialise a
    // Story for every structural sheet now, so opacity and common-origin
    // operations are available even when floors are added in sequence.
    for (const floor of sheets.filter((item) => item.role === 'structural')) {
      dispatch(ensureSheet({ sheetId: floor.id, pageIndex: floor.sourcePage }));
      const existingStory = stories.find((story) => story.sheetId === floor.id);
      if (existingStory) {
        if (floor.id === sheet.id) {
          dispatch(updateStory({ id: existingStory.id, changes: { overlayVisible: true, name: floor.name } }));
          dispatch(updateStoryAdjust({
            id: existingStory.id,
            changes: { dxMm: 0, dyMm: 0, rotationDeg: 0 },
          }));
        }
      } else {
        dispatch(addStory({
          sheetId: floor.id,
          pageIndex: floor.sourcePage,
          name: floor.name,
          overlayVisible: floor.id === sheet.id,
        }));
      }
    }

    dispatch(setBasePlanSheet(sheet.id));
    dispatch(setCurrentPage(sheet.sourcePage));
    dispatch(setActivePlanSheet(sheet.id));
    toast.success('Base floor set to ' + sheet.name + '.');
  };

  const setCommonOrigin = (sheetId: string) => {
    const sheet = sheets.find((item) => item.id === sheetId);
    if (!sheet || !base || sheet.id !== base.id) {
      toast.error('Choose the fixed Base Floor to define the shared origin.');
      return;
    }

    dispatch(ensureSheet({ sheetId: sheet.id, pageIndex: sheet.sourcePage }));
    dispatch(setCurrentPage(sheet.sourcePage));
    dispatch(setActivePlanSheet(sheet.id));
    dispatch(setOriginMode(true));
    toast.info('Click one point on the Base Floor. Its corresponding position will be mapped to all structural floor sheets.');
  };

  const deleteSheet = (sheetId: string) => {
    const target = sheets.find((item) => item.id === sheetId);
    if (!target) return;

    const relatedStory = stories.find(
      (story) => story.sheetId === sheetId,
    );

    if (relatedStory) {
      dispatch(removeStory(relatedStory.id));
    }

    dispatch(removePlanSheet(sheetId));

    if (active?.id === sheetId) {
      dispatch(activatePlanSheetForPage(currentPage));
    }
  };

  const editCrop = (sheetId: string) => {
    const sheet = sheets.find((item) => item.id === sheetId);
    if (!sheet) return;

    dispatch(setCurrentPage(sheet.sourcePage));
    dispatch(setActivePlanSheet(sheet.id));
    dispatch(beginCrop({
      sourcePage: sheet.sourcePage,
      sheetId: sheet.id,
    }));
  };

  const duplicate = (sheetId: string) => {
    dispatch(duplicatePlanSheet({ id: sheetId }));
    toast.success('Plan Sheet duplicated.');
  };

  return (
    <section className="mb-2 rounded-md border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 p-2">
        <div>
          <h3 className="text-sm font-semibold">Plan Sheets</h3>
          <p className="text-[10px] leading-4 text-muted-foreground">
            1. Crop each floor plan from the PDF (several per page are fine).
            2. Pick one as the base sheet and set the shared origin on it.
            3. Translate the other sheets onto it. Then define the storeys in the list below.
          </p>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          title="Create a Plan Sheet from the current PDF page"
          onClick={() =>
            dispatch(
              beginCrop({
                sourcePage: currentPage,
                sheetId: null,
              }),
            )
          }
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="space-y-1.5 p-2">
        {ordered.length === 0 && (
          <div className="rounded-md border border-dashed p-3 text-[11px] leading-4 text-muted-foreground">
            No floor sheets yet. Open a PDF, navigate to a floor plan, then use
            + to crop it. The original PDF remains unchanged.
          </div>
        )}
        {ordered.length > 0 && !base && (
          <div className="rounded-md border border-amber-200 bg-amber-50/60 p-2 text-[10px] leading-4 text-amber-800">
            Choose a structural sheet as the <strong>Base Sheet</strong>. It stays
            fixed; the shared origin is set on it and every other sheet is aligned to it.
          </div>
        )}

        {ordered.map((sheet) => {
          const isActive = active?.id === sheet.id;
          const isBase = base?.id === sheet.id;
          const isEditing = editingId === sheet.id;
          const usedBy = storeysUsingSheet(storeys, sheet.id);

          return (
            <div
              key={sheet.id}
              className={cn(
                'rounded-md border p-2 transition-colors',
                isActive
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-gray-200',
              )}
            >
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <Input
                      value={editingName}
                      onChange={(event) =>
                        setEditingName(event.target.value)
                      }
                      onBlur={commitRename}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') commitRename();
                        if (event.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                      className="h-6 px-1 text-xs"
                    />
                  ) : (
                    <button
                      className="block w-full truncate text-left text-xs font-medium"
                      onClick={() => activate(sheet.id)}
                    >
                      {sheet.name}
                    </button>
                  )}
                </div>

                {isBase && (
                  <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">BASE</span>
                )}
                {isActive && (
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">EDIT</span>
                )}
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
                  p.{sheet.sourcePage}
                </span>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  title="Show / hide"
                  onClick={() =>
                    dispatch(
                      updatePlanSheet({
                        id: sheet.id,
                        changes: { visible: !sheet.visible },
                      }),
                    )
                  }
                >
                  {sheet.visible ? (
                    <Eye className="h-3 w-3" />
                  ) : (
                    <EyeOff className="h-3 w-3 text-muted-foreground" />
                  )}
                </Button>
              </div>

              <div className="mt-1.5 flex items-center justify-between gap-1">
                <span className="min-w-0 truncate text-[10px] text-muted-foreground">
                  <span className="capitalize">{sheet.role}</span>
                  {usedBy.length > 0 && (
                    <span title={usedBy.map((storey) => storey.name).join(', ')}>
                      {' · '}
                      {usedBy.length <= 2
                        ? usedBy.map((storey) => storey.name).join(', ')
                        : `${usedBy.length} storeys`}
                    </span>
                  )}
                </span>

                <div className="flex items-center gap-0.5">
                  <Button
                    variant={isBase ? 'default' : 'outline'}
                    size="sm"
                    className="h-6 px-2 text-[10px]"
                    title="Set this structural floor as the fixed alignment base"
                    disabled={sheet.role !== 'structural'}
                    onClick={() => setAsBase(sheet.id)}
                  >
                    {isBase ? <Check className="mr-1 h-3 w-3" /> : null}
                    {isBase ? 'Base' : 'Set base'}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    title="Set the shared origin for all structural sheets (base sheet only)"
                    disabled={!base || !isBase}
                    onClick={() => setCommonOrigin(sheet.id)}
                  >
                    <Crosshair className="h-3 w-3" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    title="Rename"
                    onClick={() => startRename(sheet.id, sheet.name)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    title="Edit Crop"
                    onClick={() => editCrop(sheet.id)}
                  >
                    <Crop className="h-3 w-3" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    title="Duplicate"
                    onClick={() => duplicate(sheet.id)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500 hover:text-red-700"
                    title="Delete"
                    onClick={() => deleteSheet(sheet.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>


              {sheet.role === 'structural' && base && !isBase && (
                <UnderlayControls sheet={sheet} />
              )}

              {isBase && (
                <p className="mt-1.5 border-t border-gray-100 pt-1.5 text-[10px] leading-4 text-muted-foreground">
                  Fixed reference. Use the crosshair to set the shared origin; the other
                  sheets are translated onto this one.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

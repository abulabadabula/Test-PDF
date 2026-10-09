import { useMemo, useState } from 'react';
import { Copy, Crop, Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import {
  activatePlanSheetForPage,
  beginCrop,
  duplicatePlanSheet,
  removePlanSheet,
  selectActivePlanSheet,
  selectPlanSheets,
  setActivePlanSheet,
  updatePlanSheet,
} from '@/app/store/slices/planSheetSlice';
import { removeStory } from '@/app/store/slices/storySlice';
import { setCurrentPage } from '@/app/store/slices/pdfSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { UnderlayControls } from './UnderlayControls';
import { toast } from 'sonner';

export function PlanSheetPanel() {
  const dispatch = useAppDispatch();
  const sheets = useAppSelector(selectPlanSheets);
  const active = useAppSelector(selectActivePlanSheet);
  const stories = useAppSelector((state) => state.story.stories);
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
          <p className="text-[10px] text-muted-foreground">
            Cropped views of source PDF pages. Select one as the base, then
            underlay the others to align storeys.
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
            No Plan Sheets yet. Use Crop Plan to extract a floor from any PDF
            page. The original PDF remains unchanged.
          </div>
        )}

        {ordered.map((sheet) => {
          const isActive = active?.id === sheet.id;
          const isEditing = editingId === sheet.id;

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
                <span className="text-[10px] capitalize text-muted-foreground">
                  {sheet.role}
                </span>

                <div className="flex items-center gap-0.5">
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

              {/* Underlay this sheet beneath the active (base) sheet */}
              {!isActive && active && <UnderlayControls sheet={sheet} />}
            </div>
          );
        })}
      </div>
    </section>
  );
}

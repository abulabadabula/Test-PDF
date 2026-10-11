// src/features/storeys/StoreyPanel.tsx
//
// ETABS-style storey list. Rows are shown from the top storey down. Every
// storey has a height, a derived elevation and either its own Plan Sheet
// ("master") or a master storey it is similar to (a typical floor).

import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
  ArrowDown,
  ArrowUp,
  Building2,
  ChevronsDownUp,
  ChevronsUpDown,
  Pencil,
  Plus,
  Trash2,
  Wand2,
} from 'lucide-react';

import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { selectActivePlanSheet, selectPlanSheets } from '@/app/store/slices/planSheetSlice';
import {
  addStorey,
  addStoreysFromSheets,
  effectiveSheetId,
  moveStorey,
  removeStorey,
  selectStoreys,
  setActiveStorey,
  setBaseElevation,
  setStoreyElevation,
  setStoreySimilarTo,
  updateStorey,
  type Storey,
} from '@/app/store/slices/storeySlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { activateStorey } from './storeyActions';
import { StoreyTools } from './StoreyTools';
import { ensureStoryForSheet } from './storeySheets';

const selectClass =
  'h-6 w-full min-w-0 rounded border border-gray-200 bg-white px-1 text-[11px] outline-none focus:border-primary';

function NumberCell({
  value,
  onCommit,
  step = 100,
  title,
  disabled = false,
}: {
  value: number;
  onCommit: (value: number) => void;
  step?: number;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <Input
      key={value}
      type="number"
      step={step}
      title={title}
      disabled={disabled}
      defaultValue={value}
      className="h-6 w-full min-w-0 px-1 text-right text-[11px]"
      onBlur={(event) => {
        const next = Number(event.target.value);
        if (Number.isFinite(next) && next !== value) onCommit(next);
        else event.target.value = String(value);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
      }}
    />
  );
}

function StoreyRow({
  storey,
  storeys,
  isActive,
  isEditing,
  isTop,
  isBottom,
}: {
  storey: Storey;
  storeys: Storey[];
  isActive: boolean;
  isEditing: boolean;
  isTop: boolean;
  isBottom: boolean;
}) {
  const dispatch = useAppDispatch();
  const sheets = useAppSelector(selectPlanSheets).filter(
    (sheet) => sheet.role === 'structural',
  );

  const sheetId = effectiveSheetId(storey, storeys);
  const masters = storeys.filter((item) => !item.similarTo && item.id !== storey.id);
  const followers = storeys.filter((item) => item.similarTo === storey.id).length;

  const choosePlan = (value: string) => {
    if (value.startsWith('master:')) {
      dispatch(setStoreySimilarTo({ id: storey.id, masterId: value.slice(7) }));
      return;
    }

    if (storey.similarTo) {
      dispatch(setStoreySimilarTo({ id: storey.id, masterId: null }));
    }

    const next = value === '' ? null : value.slice(6);
    dispatch(updateStorey({ id: storey.id, changes: { sheetId: next } }));
    if (next) ensureStoryForSheet(next);
  };

  const planValue = storey.similarTo
    ? `master:${storey.similarTo}`
    : storey.sheetId
      ? `sheet:${storey.sheetId}`
      : '';

  return (
    <div
      className={cn(
        'space-y-1 rounded-md border p-1.5',
        isEditing
          ? 'border-primary/50 bg-primary/5'
          : isActive
            ? 'border-blue-200 bg-blue-50/40'
            : 'border-gray-200',
      )}
      onClick={() => dispatch(setActiveStorey(storey.id))}
    >
      <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1">
        <Input
          key={storey.name}
          defaultValue={storey.name}
          title="Storey name"
          className="h-6 min-w-0 px-1 text-[11px] font-medium"
          onBlur={(event) => {
            const value = event.target.value.trim();
            if (value && value !== storey.name) {
              dispatch(updateStorey({ id: storey.id, changes: { name: value } }));
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
          }}
        />
        <NumberCell
          value={storey.heightMm}
          step={100}
          title="Storey height (mm)"
          onCommit={(value) => {
            if (value > 0) {
              dispatch(updateStorey({ id: storey.id, changes: { heightMm: value } }));
            } else {
              toast.error('Storey height must be greater than zero.');
            }
          }}
        />
        <NumberCell
          value={storey.elevationMm}
          step={100}
          title="Elevation of the top of the storey (mm). Editing it changes this storey's height."
          onCommit={(value) => {
            const index = storeys.findIndex((item) => item.id === storey.id);
            const below = index > 0 ? storeys[index - 1].elevationMm : null;

            if (below !== null && value <= below) {
              toast.error('Elevation must be above the storey below.');
              return;
            }

            dispatch(setStoreyElevation({ id: storey.id, elevationMm: value }));
          }}
        />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1">
        <select
          className={selectClass}
          value={planValue}
          title="Plan Sheet drawn for this storey, or the master storey it is similar to"
          onChange={(event) => choosePlan(event.target.value)}
        >
          <option value="">- no plan sheet -</option>
          <optgroup label="Own plan sheet (master)">
            {sheets.map((sheet) => (
              <option key={sheet.id} value={`sheet:${sheet.id}`}>
                {sheet.name}
              </option>
            ))}
          </optgroup>
          {masters.length > 0 && (
            <optgroup label="Similar to">
              {masters.map((master) => (
                <option key={master.id} value={`master:${master.id}`}>
                  Similar to {master.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>

        <div className="flex items-center">
          <Button
            variant={isEditing ? 'default' : 'outline'}
            size="sm"
            className="mr-0.5 h-6 px-1.5 text-[10px]"
            title="Edit this storey: shows its plan sheet for drawing"
            disabled={!sheetId}
            onClick={(event) => {
              event.stopPropagation();
              activateStorey(storey.id);
            }}
          >
            <Pencil className="mr-0.5 h-3 w-3" />
            {isEditing ? 'Editing' : 'Edit'}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="Move up"
            disabled={isTop}
            onClick={(event) => {
              event.stopPropagation();
              dispatch(moveStorey({ id: storey.id, direction: 'up' }));
            }}
          >
            <ArrowUp className="h-3 w-3" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="Move down"
            disabled={isBottom}
            onClick={(event) => {
              event.stopPropagation();
              dispatch(moveStorey({ id: storey.id, direction: 'down' }));
            }}
          >
            <ArrowDown className="h-3 w-3" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-red-500 hover:text-red-700"
            title="Delete storey"
            onClick={(event) => {
              event.stopPropagation();
              dispatch(removeStorey(storey.id));
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {(storey.similarTo || followers > 0) && (
        <p className="text-[10px] text-muted-foreground">
          {storey.similarTo
            ? 'Typical floor: uses the master storey’s plan sheet and members.'
            : `Master of ${followers} similar storey${followers === 1 ? '' : 's'}.`}
        </p>
      )}
    </div>
  );
}

export function StoreyPanel() {
  const dispatch = useAppDispatch();

  const storeys = useAppSelector(selectStoreys);
  const baseElevationMm = useAppSelector((state) => state.storey.baseElevationMm);
  const activeStoreyId = useAppSelector((state) => state.storey.activeStoreyId);
  const planSheets = useAppSelector(selectPlanSheets);
  const activeSheet = useAppSelector(selectActivePlanSheet);

  const activeSheetId = activeSheet?.id ?? null;

  // Rows read from the top storey down, like the ETABS story table.
  const ordered = useMemo(() => [...storeys].reverse(), [storeys]);

  const sheetOfActive = useMemo(() => {
    const storey = storeys.find((item) => item.id === activeStoreyId);
    return storey ? effectiveSheetId(storey, storeys) : null;
  }, [storeys, activeStoreyId]);

  // Keep "the storey being edited" in step with the Plan Sheet shown on the canvas.
  useEffect(() => {
    if (!activeSheetId || sheetOfActive === activeSheetId) return;

    const match = storeys.find(
      (storey) => effectiveSheetId(storey, storeys) === activeSheetId,
    );

    if (match) dispatch(setActiveStorey(match.id));
  }, [activeSheetId, sheetOfActive, storeys, dispatch]);

  const structuralSheets = planSheets.filter((sheet) => sheet.role === 'structural');
  const unusedSheets = structuralSheets.filter(
    (sheet) =>
      !storeys.some(
        (storey) => !storey.similarTo && storey.sheetId === sheet.id,
      ),
  );

  const fromSheets = () => {
    if (!unusedSheets.length) {
      toast.info('Every structural plan sheet already has a storey.');
      return;
    }

    dispatch(
      addStoreysFromSheets({
        sheets: unusedSheets.map((sheet) => ({ id: sheet.id, name: sheet.name })),
      }),
    );
    unusedSheets.forEach((sheet) => ensureStoryForSheet(sheet.id));
  };

  const selected = storeys.find((storey) => storey.id === activeStoreyId);

  return (
    <section className="mb-2 rounded-md border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 p-2">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <Building2 className="h-3.5 w-3.5" />
            Storeys
          </h3>
          <p className="text-[10px] leading-4 text-muted-foreground">
            Edit the storey data like in ETABS. Give each master storey a plan
            sheet; typical floors are “similar to” a master.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1 border-b border-gray-100 p-2">
        <Button
          variant="outline"
          size="sm"
          className="h-6 px-2 text-[10px]"
          title="Add a storey on top"
          onClick={() => dispatch(addStorey({}))}
        >
          <Plus className="mr-1 h-3 w-3" />
          Add
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-6 px-2 text-[10px]"
          title="Insert a storey above the selected one"
          disabled={!selected}
          onClick={() => selected && dispatch(addStorey({ aboveId: selected.id }))}
        >
          <ChevronsDownUp className="mr-1 h-3 w-3" />
          Insert above
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-6 px-2 text-[10px]"
          title="Insert a storey below the selected one"
          disabled={!selected}
          onClick={() => selected && dispatch(addStorey({ belowId: selected.id }))}
        >
          <ChevronsUpDown className="mr-1 h-3 w-3" />
          Insert below
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-6 px-2 text-[10px]"
          title="Create one storey for every structural plan sheet that has none yet"
          disabled={!structuralSheets.length}
          onClick={fromSheets}
        >
          <Wand2 className="mr-1 h-3 w-3" />
          From plan sheets
        </Button>
      </div>

      <div className="space-y-1.5 p-2">
        <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] gap-1 px-1.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
          <span>Name</span>
          <span className="text-right">Height (mm)</span>
          <span className="text-right">Elev. (mm)</span>
        </div>

        {ordered.length === 0 && (
          <div className="rounded-md border border-dashed p-3 text-[11px] leading-4 text-muted-foreground">
            No storeys yet. Add storeys here, or crop your floor plans as plan
            sheets and use “From plan sheets”.
          </div>
        )}

        {ordered.map((storey, index) => (
          <StoreyRow
            key={storey.id}
            storey={storey}
            storeys={storeys}
            isActive={storey.id === activeStoreyId}
            isEditing={
              storey.id === activeStoreyId &&
              effectiveSheetId(storey, storeys) === activeSheetId
            }
            isTop={index === 0}
            isBottom={index === ordered.length - 1}
          />
        ))}

        <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1 rounded-md border border-dashed border-gray-300 bg-gray-50/60 p-1.5">
          <span className="text-[11px] font-medium text-muted-foreground">Base</span>
          <span />
          <NumberCell
            value={baseElevationMm}
            step={100}
            title="Elevation of the base of the lowest storey (mm)"
            onCommit={(value) => dispatch(setBaseElevation(value))}
          />
        </div>
      </div>

      {storeys.length > 0 && <StoreyTools />}
    </section>
  );
}

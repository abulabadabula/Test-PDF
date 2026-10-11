import { useEffect, useState } from 'react';
import { store } from '@/app/store';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import {
  addPlanSheet,
  finishCrop,
  selectActivePlanSheet,
  selectCropSelection,
  selectCropSession,
  updatePlanSheet,
} from '@/app/store/slices/planSheetSlice';
import { setCurrentPage } from '@/app/store/slices/pdfSlice';
import {
  selectPageCoordinateSystem,
  setSheetEngineeringOrigin,
  setSheetOrigin,
  setSheetScale,
  setSheetUnit,
} from '@/app/store/slices/pageCoordinateSlice';
import {
  assignShapesToSheet,
} from '@/app/store/slices/drawingSlice';
import { nanoid } from '@reduxjs/toolkit';
import { addSheetAsUnderlay } from '@/features/stories/underlayActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CropDialog({ open, onOpenChange }: CropDialogProps) {
  const dispatch = useAppDispatch();
  const selection = useAppSelector(selectCropSelection);
  const session = useAppSelector(selectCropSession);
  const activeSheet = useAppSelector(selectActivePlanSheet);

  const [name, setName] = useState('');
  const [role, setRole] = useState<'structural' | 'reference' | 'underlay'>('structural');

  useEffect(() => {
    if (!open) return;

    const defaultName = activeSheet && session?.sheetId === activeSheet.id
      ? activeSheet.name
      : `Plan ${session?.sourcePage ?? ''}`;

    setName(defaultName);
    setRole(activeSheet && session?.sheetId === activeSheet.id ? activeSheet.role : 'structural');
  }, [open, activeSheet, session]);

  const commit = () => {
    if (!selection || !session) return;

    if (session.sheetId) {
      dispatch(updatePlanSheet({
        id: session.sheetId,
        changes: {
          name: name.trim() || activeSheet?.name || `Plan ${session.sourcePage}`,
          crop: selection,
          role,
        },
      }));
      dispatch(setCurrentPage(session.sourcePage));
      dispatch(finishCrop());
      onOpenChange(false);
      return;
    }

    const id = nanoid();
    dispatch(addPlanSheet({
      id,
      name: name.trim() || `Plan ${session.sourcePage}`,
      sourcePage: session.sourcePage,
      crop: selection,
      role,
    }));

    // If the source page already contained modelled objects, the first
    // Plan Sheet adopts those legacy objects. New objects created on later
    // sheets will carry their own sheetId.
    dispatch(assignShapesToSheet({
      sourcePage: session.sourcePage,
      sheetId: id,
      onlyUnassigned: true,
    }));

    const sourceCoordinate = selectPageCoordinateSystem(
      store.getState(),
      session.sourcePage,
    );

    dispatch(setSheetScale({
      sheetId: id,
      numerator: sourceCoordinate.scaleNumerator,
      denominator: sourceCoordinate.scaleDenominator,
    }));
    dispatch(setSheetUnit({
      sheetId: id,
      unit: sourceCoordinate.unit,
    }));
    dispatch(setSheetOrigin({
      sheetId: id,
      x: sourceCoordinate.origin.x,
      y: sourceCoordinate.origin.y,
    }));
    dispatch(setSheetEngineeringOrigin({
      sheetId: id,
      x: sourceCoordinate.engineeringOrigin.x,
      y: sourceCoordinate.engineeringOrigin.y,
    }));

    // When a Base Floor is already selected, immediately add this new floor to
    // the comparison stack and centre it for manual alignment.
    const createdSheet = store.getState().planSheet.sheets.find(
      (sheet) => sheet.id === id,
    );
    if (
      role === 'structural' &&
      store.getState().planSheet.baseSheetId &&
      createdSheet
    ) {
      addSheetAsUnderlay(createdSheet);
    }

    dispatch(setCurrentPage(session.sourcePage));
    dispatch(finishCrop());
    onOpenChange(false);
  };

  const cancel = () => {
    dispatch(finishCrop());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : cancel())}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Create Plan Sheet</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs">Plan Name</Label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 h-8 text-sm"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Source Page</Label>
              <Input
                value={session?.sourcePage ?? ''}
                readOnly
                className="mt-1 h-8 bg-muted/30 font-mono text-xs"
              />
            </div>

            <div>
              <Label className="text-xs">Plan Type</Label>
              <Select value={role} onValueChange={(value) => setRole(value as typeof role)}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="structural">Structural</SelectItem>
                  <SelectItem value="reference">Reference</SelectItem>
                  <SelectItem value="underlay">Underlay</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border bg-muted/20 p-3 text-[11px] text-muted-foreground">
            <div className="font-medium text-foreground">Crop window</div>
            <div className="mt-1 font-mono">
              x={selection?.x.toFixed(1) ?? '-'} · y={selection?.y.toFixed(1) ?? '-'} ·
              w={selection?.width.toFixed(1) ?? '-'} · h={selection?.height.toFixed(1) ?? '-'} pt
            </div>
          </div>

          <p className="text-[11px] leading-4 text-muted-foreground">
            The original PDF page is never modified. The selected area is stored as a virtual Plan Sheet
            and can later be edited without changing the structural model coordinates.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={cancel}>Cancel</Button>
          <Button onClick={commit} disabled={!selection || !session || selection.width < 8 || selection.height < 8}>
            {session?.sheetId ? 'Update Crop' : 'Create Plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

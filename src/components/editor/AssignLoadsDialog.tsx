import { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import {
  addLoadAssignment,
  updateLoadAssignment,
  deleteLoadAssignment,
  type LoadAssignment,
  type LoadAssignmentType,
  type LoadDirection,
} from '@/app/store/slices/loadAssignmentsSlice';
import type { StructuralElement } from '@/features/drawing/elements/elementTypes';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  element: StructuralElement | null;
  editAssignmentId?: string | null;
  onEditAssignmentIdChange?: (id: string | null) => void;
}

const directions: LoadDirection[] = ['Global X', 'Global Y', 'Global Z', 'Local 1', 'Local 2', 'Local 3'];

function supportedTypes(type: StructuralElement['type']) {
  if (type === 'node') return ['Joint Load'] as LoadAssignmentType[];
  if (type === 'slab') return ['Area Load'] as LoadAssignmentType[];
  return ['Frame Point Load', 'Frame Distributed Load'] as LoadAssignmentType[];
}

function summary(a: LoadAssignment, caseName: string) {
  if (a.loadType === 'Joint Load') {
    return caseName + ' · Fx ' + (a.fx ?? 0) + ' kN · Fy ' + (a.fy ?? 0) +
      ' kN · Fz ' + (a.fz ?? 0) + ' kN · Mz ' + (a.mz ?? 0) + ' kN·m';
  }
  if (a.loadType === 'Area Load') {
    return caseName + ' · ' + (a.pressure ?? 0) + ' kPa · ' + (a.direction ?? 'Global Z');
  }
  if (a.loadType === 'Frame Point Load') {
    return caseName + ' · ' + (a.magnitudeStart ?? 0) + ' kN · ' +
      (a.direction ?? 'Global Z') + ' · rel. dist=' + (a.distanceFromStart ?? 0);
  }
  if (a.loadType === 'Frame Distributed Load') {
    return caseName + ' · ' + (a.magnitudeStart ?? 0) + ' → ' +
      (a.magnitudeEnd ?? a.magnitudeStart ?? 0) + ' kN/m · ' + (a.direction ?? 'Global Z') +
      ' · rel. pos=' + (a.startRelativePosition ?? 0) + ' to ' + (a.endRelativePosition ?? 1);
  }
  return caseName + ' · ' + (a.magnitudeStart ?? 0) + ' → ' +
    (a.magnitudeEnd ?? a.magnitudeStart ?? 0) + ' kN/m · ' + (a.direction ?? 'Global Z');
}

export function AssignLoadsDialog({
  open,
  onOpenChange,
  element,
  editAssignmentId = null,
  onEditAssignmentIdChange,
}: Props) {
  const dispatch = useAppDispatch();
  const loadCases = useAppSelector((s) => s.loads.loadCases);
  const assignments = useAppSelector((s) => s.loadAssignments.assignments);

  const [loadCaseId, setLoadCaseId] = useState('');
  const [loadType, setLoadType] = useState<LoadAssignmentType>('Joint Load');
  const [direction, setDirection] = useState<LoadDirection>('Global Z');

  const [fx, setFx] = useState('0');
  const [fy, setFy] = useState('0');
  const [fz, setFz] = useState('0');
  const [mx, setMx] = useState('0');
  const [my, setMy] = useState('0');
  const [mz, setMz] = useState('0');

  const [distanceFromStart, setDistanceFromStart] = useState('0');
  const [startRelativePosition, setStartRelativePosition] = useState('0');
  const [endRelativePosition, setEndRelativePosition] = useState('1');
  const [magnitudeStart, setMagnitudeStart] = useState('0');
  const [magnitudeEnd, setMagnitudeEnd] = useState('0');
  const [pressure, setPressure] = useState('0');
  const [description, setDescription] = useState('');

  const supported = useMemo(
    () => (element ? supportedTypes(element.type) : []),
    [element],
  );

  const targetAssignments = useMemo(
    () => element ? assignments.filter((a) => a.targetId === element.id) : [],
    [assignments, element],
  );

  const editingAssignment = useMemo(
    () =>
      editAssignmentId
        ? assignments.find((assignment) => assignment.id === editAssignmentId)
        : undefined,
    [assignments, editAssignmentId],
  );

  useEffect(() => {
    if (!open || !element) return;

    if (editingAssignment) {
      setLoadCaseId(editingAssignment.loadCaseId);
      setLoadType(editingAssignment.loadType);
      setDirection(editingAssignment.direction ?? 'Global Z');
      setFx(String(editingAssignment.fx ?? 0));
      setFy(String(editingAssignment.fy ?? 0));
      setFz(String(editingAssignment.fz ?? 0));
      setMx(String(editingAssignment.mx ?? 0));
      setMy(String(editingAssignment.my ?? 0));
      setMz(String(editingAssignment.mz ?? 0));
      setDistanceFromStart(String(editingAssignment.distanceFromStart ?? 0));
      setStartRelativePosition(String(editingAssignment.startRelativePosition ?? 0));
      setEndRelativePosition(String(editingAssignment.endRelativePosition ?? 1));
      setMagnitudeStart(String(editingAssignment.magnitudeStart ?? 0));
      setMagnitudeEnd(String(editingAssignment.magnitudeEnd ?? 0));
      setPressure(String(editingAssignment.pressure ?? 0));
      setDescription(editingAssignment.description ?? '');
      return;
    }

    setLoadCaseId(loadCases[0]?.id ?? '');
    setLoadType(supported[0] ?? 'Joint Load');
    setDirection('Global Z');
    setFx('0'); setFy('0'); setFz('0');
    setMx('0'); setMy('0'); setMz('0');
    setDistanceFromStart('0');
    setStartRelativePosition('0');
    setEndRelativePosition('1');
    setMagnitudeStart('0'); setMagnitudeEnd('0');
    setPressure('0'); setDescription('');
  }, [open, element, loadCases, supported, editingAssignment]);

  const num = (value: string) => Number.isFinite(Number(value)) ? Number(value) : 0;

  // ============================================================================
  // STRICT VALIDATION LOGIC
  // ============================================================================
  const isPointLoadValid = useMemo(() => {
    const dist = Number(distanceFromStart);
    return Number.isFinite(dist) && dist >= 0 && dist <= 1;
  }, [distanceFromStart]);

  const isDistLoadValid = useMemo(() => {
    const startPos = Number(startRelativePosition);
    const endPos = Number(endRelativePosition);
    return (
      Number.isFinite(startPos) &&
      Number.isFinite(endPos) &&
      startPos >= 0 &&
      startPos <= 1 &&
      endPos >= 0 &&
      endPos <= 1 &&
      endPos > startPos
    );
  }, [startRelativePosition, endRelativePosition]);

  const isFormValid = useMemo(() => {
    if (!loadCaseId) return false;
    if (loadType === 'Frame Point Load') return isPointLoadValid;
    if (loadType === 'Frame Distributed Load') return isDistLoadValid;
    return true; // Joint Load and Area Load have no strict relative position constraints
  }, [loadCaseId, loadType, isPointLoadValid, isDistLoadValid]);
  // ============================================================================

  const buildChanges = () => {
    const base = {
      targetId: element?.id ?? '',
      targetType: element?.type ?? 'node',
      loadCaseId,
      loadType,
      description: description.trim(),
    } satisfies Omit<LoadAssignment, 'id' | 'createdAt' | 'source'>;

    if (loadType === 'Joint Load') {
      return {
        ...base,
        fx: num(fx), fy: num(fy), fz: num(fz),
        mx: num(mx), my: num(my), mz: num(mz),
        direction: undefined,
        distanceFromStart: undefined,
        startRelativePosition: undefined,
        endRelativePosition: undefined,
        magnitudeStart: undefined,
        magnitudeEnd: undefined,
        pressure: undefined,
      };
    }

    if (loadType === 'Area Load') {
      return {
        ...base,
        direction,
        pressure: num(pressure),
        fx: undefined, fy: undefined, fz: undefined,
        mx: undefined, my: undefined, mz: undefined,
        distanceFromStart: undefined,
        startRelativePosition: undefined,
        endRelativePosition: undefined,
        magnitudeStart: undefined,
        magnitudeEnd: undefined,
      };
    }

    if (loadType === 'Frame Point Load') {
      return {
        ...base,
        direction,
        distanceFromStart: num(distanceFromStart),
        magnitudeStart: num(magnitudeStart),
        magnitudeEnd: undefined,
        startRelativePosition: undefined,
        endRelativePosition: undefined,
        pressure: undefined,
        fx: undefined, fy: undefined, fz: undefined,
        mx: undefined, my: undefined, mz: undefined,
      };
    }

    return {
      ...base,
      direction,
      startRelativePosition: num(startRelativePosition),
      endRelativePosition: num(endRelativePosition),
      magnitudeStart: num(magnitudeStart),
      magnitudeEnd: num(magnitudeEnd),
      distanceFromStart: undefined,
      pressure: undefined,
      fx: undefined, fy: undefined, fz: undefined,
      mx: undefined, my: undefined, mz: undefined,
    };
  };

  const resetEdit = () => {
    onEditAssignmentIdChange?.(null);
  };

  const add = () => {
    if (!element || !loadCaseId || !isFormValid) return;
    dispatch(addLoadAssignment(buildChanges()));
    setDescription('');
  };

  const saveEdit = () => {
    if (!editingAssignment || !element || !loadCaseId || !isFormValid) return;
    dispatch(updateLoadAssignment({ id: editingAssignment.id, changes: buildChanges() }));
    resetEdit();
    onOpenChange(false);
  };

  const deleteAssignment = (id: string) => {
    dispatch(deleteLoadAssignment(id));
    if (editAssignmentId === id) {
      resetEdit();
    }
  };
  
  const caseName = (id: string) => loadCases.find((item) => item.id === id)?.name ?? 'Unknown';

  if (!element) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingAssignment ? 'Edit Load — ' + element.label : 'Assign Loads — ' + element.label}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-muted/20 p-3 text-xs">
            Target: <span className="font-medium">{element.label} ({element.type})</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Load Case</Label>
              <Select value={loadCaseId} onValueChange={setLoadCaseId}>
                <SelectTrigger className="h-8"><SelectValue placeholder="Select load case" /></SelectTrigger>
                <SelectContent>
                  {loadCases.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Load Type</Label>
              <Select value={loadType} onValueChange={(v) => setLoadType(v as LoadAssignmentType)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {supported.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {loadType === 'Joint Load' && (
              <>
                <div className="col-span-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Joint Forces [kN]
                </div>
                {[
                  ['Fx', fx, setFx], ['Fy', fy, setFy], ['Fz', fz, setFz],
                ].map(([label, value, setter]) => (
                  <div key={label as string} className="space-y-1.5">
                    <Label className="text-xs">{label as string}</Label>
                    <Input className="h-8" type="number" step="0.01" value={value as string}
                      onChange={(e) => (setter as (v: string) => void)(e.target.value)} />
                  </div>
                ))}
                <div className="col-span-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Joint Moments [kN·m]
                </div>
                {[
                  ['Mx', mx, setMx], ['My', my, setMy], ['Mz', mz, setMz],
                ].map(([label, value, setter]) => (
                  <div key={label as string} className="space-y-1.5">
                    <Label className="text-xs">{label as string}</Label>
                    <Input className="h-8" type="number" step="0.01" value={value as string}
                      onChange={(e) => (setter as (v: string) => void)(e.target.value)} />
                  </div>
                ))}
              </>
            )}

            {(loadType === 'Frame Point Load' || loadType === 'Frame Distributed Load') && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Direction</Label>
                  <Select value={direction} onValueChange={(v) => setDirection(v as LoadDirection)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>{directions.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                {loadType === 'Frame Point Load' ? (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Relative Distance from Start (0 to 1)</Label>
                      <Input 
                        className="h-8" 
                        type="number" 
                        min="0" 
                        max="1" 
                        step="0.01"
                        value={distanceFromStart} 
                        onChange={(e) => setDistanceFromStart(e.target.value)} 
                      />
                      {!isPointLoadValid && (
                        <span className="text-[10px] text-red-500 font-medium">
                          Error: Must be a number between 0 and 1
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Magnitude [kN]</Label>
                      <Input className="h-8" type="number" step="0.01"
                        value={magnitudeStart} onChange={(e) => setMagnitudeStart(e.target.value)} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Start Relative Position (0 to 1)</Label>
                      <Input 
                        className="h-8" 
                        type="number" 
                        min="0" 
                        max="1" 
                        step="0.01"
                        value={startRelativePosition} 
                        onChange={(e) => setStartRelativePosition(e.target.value)} 
                      />
                      {!isDistLoadValid && (
                        <span className="text-[10px] text-red-500 font-medium">
                          Error: Must be between 0 and 1
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">End Relative Position (0 to 1)</Label>
                      <Input 
                        className="h-8" 
                        type="number" 
                        min="0" 
                        max="1" 
                        step="0.01"
                        value={endRelativePosition} 
                        onChange={(e) => setEndRelativePosition(e.target.value)} 
                      />
                      {!isDistLoadValid && (
                        <span className="text-[10px] text-red-500 font-medium">
                          Error: Must be between 0 and 1, and strictly greater than Start Position
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Start Magnitude [kN/m]</Label>
                      <Input className="h-8" type="number" step="0.01"
                        value={magnitudeStart} onChange={(e) => setMagnitudeStart(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">End Magnitude [kN/m]</Label>
                      <Input className="h-8" type="number" step="0.01"
                        value={magnitudeEnd} onChange={(e) => setMagnitudeEnd(e.target.value)} />
                    </div>
                  </>
                )}
              </>
            )}

            {loadType === 'Area Load' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Direction</Label>
                  <Select value={direction} onValueChange={(v) => setDirection(v as LoadDirection)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>{directions.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Pressure [kPa]</Label>
                  <Input className="h-8" type="number" step="0.01"
                    value={pressure} onChange={(e) => setPressure(e.target.value)} />
                </div>
              </>
            )}

            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Input className="h-8" value={description}
                onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1 h-9"
              onClick={editingAssignment ? saveEdit : add}
              disabled={!isFormValid}
              title={!isFormValid ? "Please fix the validation errors before submitting" : ""}
            >
              {editingAssignment ? 'Save Load Changes' : 'Assign Load'}
            </Button>
            {editingAssignment && (
              <Button variant="outline" className="h-9" onClick={resetEdit}>
                Cancel Edit
              </Button>
            )}
          </div>

          <div className="rounded-md border">
            <div className="p-2 bg-muted font-medium text-xs">Assigned Loads</div>
            <div className="max-h-56 overflow-y-auto">
              {!targetAssignments.length && (
                <div className="p-3 text-xs text-muted-foreground text-center">No loads assigned.</div>
              )}
              {targetAssignments.map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-2 border-b p-2 last:border-0 text-xs">
                  <div className="min-w-0">
                    <div className="font-medium">{a.loadType}</div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">{summary(a, caseName(a.loadCaseId))}</div>
                    {a.description && <div className="mt-1 text-[10px] text-muted-foreground">{a.description}</div>}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[10px]"
                      onClick={() => onEditAssignmentIdChange?.(a.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteAssignment(a.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
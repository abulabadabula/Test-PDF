// src/features/drawing/StructuralPropertyDialog.tsx

import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch } from '@/app/store/hooks';
import { updateShape } from '@/app/store/slices/drawingSlice';
import type { StructuralElement } from './elements/elementTypes';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { pagePtToRealMm, realMmToPagePt } from '@/core/coordinate/engineeringScale';

interface Props {
  element: StructuralElement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scaleDenominator?: number;
  scaleNumerator?: number;
}

const pageGeometryFields = new Set([
  'width',
  'depth',
  'thickness',
  'height',
  'columnWidth',
  'columnDepth',
  'beamWidth',
  'beamDepth',
]);

const numericFields = new Set([
  'width',
  'depth',
  'rotation',
  'thickness',
  'height',
  'columnWidth',
  'columnDepth',
  'beamWidth',
  'beamDepth',
]);

export function StructuralPropertyDialog({
  element,
  open,
  onOpenChange,
  scaleDenominator = 100,
  scaleNumerator = 1,
}: Props) {
  const dispatch = useAppDispatch();
  const [draft, setDraft] = useState<Record<string, string>>({});

  const fields = useMemo(() => {
    if (!element) return [] as string[];
    switch (element.type) {
      case 'column':
        return ['label', 'width', 'depth', 'rotation', 'section', 'material'];
      case 'beam':
        return ['label', 'width', 'depth', 'section', 'material'];
      case 'wall':
        return ['label', 'thickness', 'wallType', 'material'];
      case 'slab':
        return ['label', 'thickness', 'level', 'material'];
      case 'portalFrame':
        return ['label', 'height', 'columnWidth', 'columnDepth', 'beamWidth', 'beamDepth', 'section', 'material'];
      default:
        return [] as string[];
    }
  }, [element]);

  useEffect(() => {
    if (!element) return;
    const g: any = element.geometry;
    const p: any = element.properties;
    const data: Record<string, unknown> = { label: element.label, ...p };

    if (element.type === 'column') {
      data.width = pagePtToRealMm(g.width, scaleNumerator, scaleDenominator);
      data.depth = pagePtToRealMm(g.depth, scaleNumerator, scaleDenominator);
      data.rotation = g.rotation;
    }
    if (element.type === 'beam') {
      data.width = pagePtToRealMm(g.width, scaleNumerator, scaleDenominator);
      data.depth = pagePtToRealMm(g.depth, scaleNumerator, scaleDenominator);
    }
    if (element.type === 'wall') {
      data.thickness = pagePtToRealMm(g.thickness, scaleNumerator, scaleDenominator);
    }
    if (element.type === 'portalFrame') {
      data.height = pagePtToRealMm(g.height, scaleNumerator, scaleDenominator);
      data.columnWidth = pagePtToRealMm(g.columnWidth, scaleNumerator, scaleDenominator);
      data.columnDepth = pagePtToRealMm(g.columnDepth, scaleNumerator, scaleDenominator);
      data.beamWidth = pagePtToRealMm(g.beamWidth, scaleNumerator, scaleDenominator);
      data.beamDepth = pagePtToRealMm(g.beamDepth, scaleNumerator, scaleDenominator);
    }
    if (element.type === 'slab') {
      data.thickness = p.thickness;
    }

    setDraft(
      Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, String(value ?? '')])
      )
    );
  }, [element, scaleDenominator, scaleNumerator]);

  if (!element) return null;

  const apply = () => {
    const g: any = { ...element.geometry };
    const p: any = { ...element.properties };

    for (const key of fields) {
      if (key === 'label') continue;
      if (!(key in draft)) continue;

      const value = numericFields.has(key) ? Number(draft[key]) : draft[key];
      if (numericFields.has(key) && (!Number.isFinite(value as number) || (value as number) < 0)) {
        return;
      }

      if (pageGeometryFields.has(key) && key in g) {
        if (element.type === 'slab' && key === 'thickness') {
          p.thickness = value;
        } else {
          g[key] = realMmToPagePt(value as number, scaleNumerator, scaleDenominator);
        }
      } else if (key in p) {
        p[key] = numericFields.has(key) ? Number(value) : value;
      }
    }

    p.label = draft.label || element.label;
    dispatch(
      updateShape({
        id: element.id,
        changes: {
          label: p.label,
          geometry: g,
          properties: p,
        },
      })
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{element.type} Properties</DialogTitle>
        </DialogHeader>

        <div className="mb-2 text-xs text-muted-foreground">
          Geometric dimensions are displayed in real engineering millimetres.
          Drawing scale: <strong>
            {scaleNumerator === 1 ? `1:${scaleDenominator}` : `${scaleNumerator}:${scaleDenominator}`}
          </strong>
          . Viewer zoom is not part of engineering calculations.
        </div>

        <div className="grid grid-cols-2 gap-3">
          {fields.map((field) => (
            <div key={field} className="space-y-1">
              <label className="text-xs text-muted-foreground capitalize">{field}</label>
              <Input
                type={numericFields.has(field) ? 'number' : 'text'}
                value={draft[field] ?? ''}
                min={numericFields.has(field) ? 0 : undefined}
                step={numericFields.has(field) ? 'any' : undefined}
                onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.value }))}
              />
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={apply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
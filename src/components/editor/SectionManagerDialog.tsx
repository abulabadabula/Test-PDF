import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { addSection } from '@/app/store/slices/propertiesSlice';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Material, Section } from '@/app/store/slices/propertiesSlice';
import {
  calculateSectionProperties,
  getSectionDimensionFields,
  sectionTypeLabel,
  type SectionDimensions,
  type SectionType,
} from '@/core/section/sectionGeometry';

interface SectionManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialType?: SectionType;
}

const SECTION_TYPES: SectionType[] = [
  'Rectangular',
  'Circular',
  'Circular Tube',
  'Square Tube',
  'H-Section',
  'PFC',
  'L-Section',
  'Custom',
];

function getDefaultDimensionDraft(type: SectionType): Record<string, string> {
  return Object.fromEntries(
    getSectionDimensionFields(type).map((field) => [field.key, String(field.defaultValue)]),
  );
}

export function SectionManagerDialog({
  open,
  onOpenChange,
  initialType = 'Rectangular',
}: SectionManagerDialogProps) {
  const dispatch = useAppDispatch();
  const materials = useAppSelector((s) => s.properties.materials);
  const sections = useAppSelector((s) => s.properties.sections);

  const [secName, setSecName] = useState('');
  const [secType, setSecType] = useState<SectionType>(initialType);
  const [secMatId, setSecMatId] = useState(materials[0]?.id || '');
  const [dimensions, setDimensions] = useState<Record<string, string>>(
    getDefaultDimensionDraft(initialType),
  );
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setSecType(initialType);
    setSecName('');
    setError('');
    setSecMatId(materials[0]?.id || '');
    setDimensions(getDefaultDimensionDraft(initialType));
  }, [open, initialType]);

  useEffect(() => {
    if (materials.length && !materials.some((material) => material.id === secMatId)) {
      setSecMatId(materials[0].id);
    }
  }, [materials, secMatId]);

  const dimensionFields = useMemo(() => getSectionDimensionFields(secType), [secType]);

  const handleTypeChange = (value: string) => {
    const nextType = value as SectionType;
    setSecType(nextType);
    setDimensions(getDefaultDimensionDraft(nextType));
    setError('');
  };

  const handleAddSection = () => {
    setError('');

    if (!secName.trim()) {
      setError('Please enter a section name.');
      return;
    }

    if (!secMatId) {
      setError('Please define/select a material before adding a section.');
      return;
    }

    const numericDimensions: SectionDimensions = Object.fromEntries(
      dimensionFields.map((field) => [field.key, Number(dimensions[field.key])]),
    );

    const invalidDimension = dimensionFields.some(
      (field) => !Number.isFinite(numericDimensions[field.key]) || numericDimensions[field.key] <= 0,
    );
    if (invalidDimension) {
      setError('All section dimensions must be positive numbers.');
      return;
    }

    const calculated = calculateSectionProperties(secType, numericDimensions);
    if (!calculated) {
      setError('The section dimensions are geometrically invalid for this section type.');
      return;
    }

    dispatch(addSection({
      name: secName.trim(),
      type: secType,
      materialId: secMatId,
      ...calculated,
      dimensions: numericDimensions,
      ...(secType === 'Rectangular'
        ? { width: numericDimensions.width, height: numericDimensions.height }
        : {}),
    }));
    setSecName('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Define Section Properties</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input
                className="h-8"
                value={secName}
                onChange={(e) => setSecName(e.target.value)}
                placeholder="e.g., 200x300 RC"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Section Type</Label>
              <Select value={secType} onValueChange={handleTypeChange}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SECTION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {sectionTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Material</Label>
              <Select value={secMatId} onValueChange={setSecMatId}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent>
                  {materials.map((m: Material) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {dimensionFields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-xs">{field.label}</Label>
                <Input
                  className="h-8"
                  type="number"
                  min="0"
                  step="any"
                  value={dimensions[field.key] ?? ''}
                  onChange={(e) =>
                    setDimensions((current) => ({ ...current, [field.key]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>

          <div className="rounded-md border bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
            <div>Section: <span className="font-medium text-foreground">{sectionTypeLabel(secType)}</span></div>
            <div className="mt-1">Properties: Area, Ix and Iy are calculated automatically in mm² and mm⁴.</div>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <Button onClick={handleAddSection} className="w-full h-9">
            Add Section
          </Button>

          <div className="border rounded-md">
            <div className="p-2 bg-muted font-medium text-xs">Existing Sections</div>
            <div className="max-h-48 overflow-y-auto">
              {sections.length === 0 && (
                <div className="p-3 text-xs text-muted-foreground text-center">No sections defined yet.</div>
              )}
              {sections.map((s: Section) => {
                const mat = materials.find((m: Material) => m.id === s.materialId);
                return (
                  <div key={s.id} className="p-2 border-b text-xs last:border-0">
                    <div className="flex justify-between items-center gap-2">
                      <span className="truncate">
                        {s.name}{' '}
                        <span className="text-muted-foreground">({sectionTypeLabel(s.type)})</span>
                      </span>
                      <span className="text-muted-foreground shrink-0">
                        {mat?.name || 'No Material'}
                      </span>
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground font-mono">
                      A={s.area.toFixed(1)} mm² · Ix={s.Ix.toExponential(3)} · Iy={s.Iy.toExponential(3)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

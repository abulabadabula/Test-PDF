import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import {
  deleteMaterial,
  updateMaterial,
  deleteSection,
  updateSection,
} from '@/app/store/slices/propertiesSlice';
import {
  calculateSectionProperties,
  getSectionDimensionFields,
  sectionTypeLabel,
  type SectionDimensions,
  type SectionType,
} from '@/core/section/sectionGeometry';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Material, Section } from '@/app/store/slices/propertiesSlice';

interface PropertyEditorDialogProps {
  nodeType: 'material' | 'section';
  data: Material | Section | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

function makeDimensionDraft(type: SectionType, section?: Section): Record<string, string> {
  const defaults = getSectionDimensionFields(type);

  return Object.fromEntries(
    defaults.map((field) => [
      field.key,
      section?.dimensions?.[field.key] !== undefined
        ? String(section.dimensions[field.key])
        : String(field.defaultValue),
    ]),
  );
}

export function PropertyEditorDialog({
  nodeType,
  data,
  open,
  onOpenChange,
}: PropertyEditorDialogProps) {
  const dispatch = useAppDispatch();
  const materials = useAppSelector((s) => s.properties.materials);

  const [materialForm, setMaterialForm] = useState<Partial<Material>>({});
  const [sectionForm, setSectionForm] = useState<{
    name: string;
    type: SectionType;
    materialId: string;
    dimensions: Record<string, string>;
  }>({
    name: '',
    type: 'Rectangular',
    materialId: '',
    dimensions: makeDimensionDraft('Rectangular'),
  });
  const [error, setError] = useState('');

  const dimensionFields = useMemo(
    () => getSectionDimensionFields(sectionForm.type),
    [sectionForm.type],
  );

  useEffect(() => {
    if (!open || !data) return;

    setError('');

    if (nodeType === 'material') {
      const material = data as Material;
      setMaterialForm({
        name: material.name,
        type: material.type,
        youngsModulus: material.youngsModulus,
        poissonRatio: material.poissonRatio,
        density: material.density,
      });
      return;
    }

    const section = data as Section;
    setSectionForm({
      name: section.name,
      type: section.type,
      materialId: section.materialId,
      dimensions: makeDimensionDraft(section.type, section),
    });
  }, [data, nodeType, open]);

  const handleMaterialChange = (field: keyof Material, value: string | number) => {
    setMaterialForm((current) => ({ ...current, [field]: value }));
    setError('');
  };

  const handleSectionTypeChange = (value: string) => {
    const type = value as SectionType;
    setSectionForm((current) => ({
      ...current,
      type,
      dimensions: makeDimensionDraft(type),
    }));
    setError('');
  };

  const handleSectionDimensionChange = (key: string, value: string) => {
    setSectionForm((current) => ({
      ...current,
      dimensions: {
        ...current.dimensions,
        [key]: value,
      },
    }));
    setError('');
  };

  const handleSave = () => {
    if (!data) return;
    setError('');

    if (nodeType === 'material') {
      const name = String(materialForm.name ?? '').trim();
      const youngsModulus = Number(materialForm.youngsModulus);
      const poissonRatio = Number(materialForm.poissonRatio);
      const density = Number(materialForm.density);

      if (!name) {
        setError('Please enter a material name.');
        return;
      }

      if (
        !Number.isFinite(youngsModulus) ||
        youngsModulus <= 0 ||
        !Number.isFinite(poissonRatio) ||
        poissonRatio < 0 ||
        poissonRatio > 0.5 ||
        !Number.isFinite(density) ||
        density <= 0
      ) {
        setError('Enter valid positive material properties; Poisson\'s ratio must be between 0 and 0.5.');
        return;
      }

      dispatch(
        updateMaterial({
          id: data.id,
          changes: {
            name,
            type: materialForm.type as Material['type'],
            youngsModulus,
            poissonRatio,
            density,
          },
        }),
      );
      onOpenChange(false);
      return;
    }

    const name = sectionForm.name.trim();

    if (!name) {
      setError('Please enter a section name.');
      return;
    }

    if (!sectionForm.materialId) {
      setError('Please select a material for this section.');
      return;
    }

    const dimensions: SectionDimensions = Object.fromEntries(
      dimensionFields.map((field) => [
        field.key,
        Number(sectionForm.dimensions[field.key]),
      ]),
    );

    const invalidDimension = dimensionFields.some(
      (field) =>
        !Number.isFinite(dimensions[field.key]) ||
        dimensions[field.key] <= 0,
    );

    if (invalidDimension) {
      setError('All section dimensions must be positive numbers.');
      return;
    }

    const calculated = calculateSectionProperties(sectionForm.type, dimensions);

    if (!calculated) {
      setError('The section dimensions are geometrically invalid for this section type.');
      return;
    }

    dispatch(
      updateSection({
        id: data.id,
        changes: {
          name,
          type: sectionForm.type,
          materialId: sectionForm.materialId,
          dimensions,
          ...calculated,
          ...(sectionForm.type === 'Rectangular'
            ? {
                width: dimensions.width,
                height: dimensions.height,
              }
            : {}),
        },
      }),
    );

    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!data) return;

    if (nodeType === 'material') {
      dispatch(deleteMaterial(data.id));
    } else {
      dispatch(deleteSection(data.id));
    }

    onOpenChange(false);
  };

  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit {nodeType === 'material' ? 'Material' : 'Section'} Properties
          </DialogTitle>
        </DialogHeader>

        {nodeType === 'material' ? (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input
                  className="h-8"
                  value={String(materialForm.name ?? '')}
                  onChange={(e) => handleMaterialChange('name', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select
                  value={materialForm.type as string}
                  onValueChange={(value) => handleMaterialChange('type', value)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Steel">Steel</SelectItem>
                    <SelectItem value="Concrete">Concrete</SelectItem>
                    <SelectItem value="Timber">Timber</SelectItem>
                    <SelectItem value="Custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Young&apos;s Modulus (E) [MPa]</Label>
                <Input
                  className="h-8"
                  type="number"
                  min="0"
                  value={String(materialForm.youngsModulus ?? '')}
                  onChange={(e) =>
                    handleMaterialChange('youngsModulus', Number(e.target.value))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Poisson&apos;s Ratio (ν)</Label>
                <Input
                  className="h-8"
                  type="number"
                  min="0"
                  max="0.5"
                  step="0.01"
                  value={String(materialForm.poissonRatio ?? '')}
                  onChange={(e) =>
                    handleMaterialChange('poissonRatio', Number(e.target.value))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Density (kg/m³)</Label>
                <Input
                  className="h-8"
                  type="number"
                  min="0"
                  value={String(materialForm.density ?? '')}
                  onChange={(e) =>
                    handleMaterialChange('density', Number(e.target.value))
                  }
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input
                  className="h-8"
                  value={sectionForm.name}
                  onChange={(e) =>
                    setSectionForm((current) => ({
                      ...current,
                      name: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Section Type</Label>
                <Select
                  value={sectionForm.type}
                  onValueChange={handleSectionTypeChange}
                >
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
                <Select
                  value={sectionForm.materialId}
                  onValueChange={(value) =>
                    setSectionForm((current) => ({
                      ...current,
                      materialId: value,
                    }))
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select material" />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-[10px] text-muted-foreground">
                  The selected material is part of this section definition.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {dimensionFields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label className="text-xs">{field.label}</Label>
                  <Input
                    className="h-8"
                    type="number"
                    min="0"
                    step="any"
                    value={sectionForm.dimensions[field.key] ?? ''}
                    onChange={(e) =>
                      handleSectionDimensionChange(field.key, e.target.value)
                    }
                  />
                </div>
              ))}
            </div>

            <div className="rounded-md border bg-muted/20 px-3 py-2 text-[10px] text-muted-foreground">
              Area, Ix and Iy are recalculated automatically from the section
              dimensions when you save. For Custom sections, enter Area, Ix and
              Iy directly.
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save changes</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

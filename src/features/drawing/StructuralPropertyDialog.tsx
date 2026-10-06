// src/features/drawing/StructuralPropertyDialog.tsx

import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { updateShape } from '@/app/store/slices/drawingSlice';
import type { StructuralElement } from './elements/elementTypes';
import type { LoadAssignment } from '@/app/store/slices/loadAssignmentsSlice';
import { AssignLoadsDialog } from '@/components/editor/AssignLoadsDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { pagePtToRealMm, realMmToPagePt } from '@/core/coordinate/engineeringScale';
import type { Material, Section } from '@/app/store/slices/propertiesSlice';

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

function normalizeReference(value: string | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/×/g, 'x')
    .replace(/\s+/g, '')
    .replace(/[()_\-]/g, '');
}

function getElementFields(element: StructuralElement | null): string[] {
  if (!element) return [];

  switch (element.type) {
    case 'node':
      return ['label'];
    case 'column':
      return ['label', 'width', 'depth', 'rotation'];
    case 'beam':
      return ['label', 'width', 'depth'];
    case 'wall':
      return ['label', 'thickness', 'wallType'];
    case 'slab':
      return ['label', 'thickness', 'level'];
    case 'portalFrame':
      return [
        'label',
        'height',
        'columnWidth',
        'columnDepth',
        'beamWidth',
        'beamDepth',
      ];
    default:
      return [];
  }
}

function hasMaterial(element: StructuralElement | null): boolean {
  return !!element && element.type !== 'node';
}

function hasSection(element: StructuralElement | null): boolean {
  return (
    !!element &&
    (element.type === 'column' ||
      element.type === 'beam' ||
      element.type === 'portalFrame')
  );
}

function resolveMaterialId(
  element: StructuralElement | null,
  materials: Material[],
): string {
  if (!element || element.type === 'node') return '';

  const properties = element.properties as any;
  const byId =
    typeof properties.materialId === 'string'
      ? materials.find((material) => material.id === properties.materialId)
      : undefined;

  if (byId) return byId.id;

  const materialText =
    typeof properties.material === 'string' ? properties.material : '';

  const exactName = materials.find(
    (material) =>
      material.name.toLowerCase() === materialText.toLowerCase(),
  );

  if (exactName) return exactName.id;

  const byType = materials.find(
    (material) =>
      material.type.toLowerCase() === materialText.toLowerCase(),
  );

  if (byType) return byType.id;

  return '';
}

function resolveSectionId(
  element: StructuralElement | null,
  sections: Section[],
  materials: Material[],
  resolvedMaterialId: string,
): string {
  if (!element || !hasSection(element)) return '';

  const properties = element.properties as any;

  const byId =
    typeof properties.sectionId === 'string'
      ? sections.find((section) => section.id === properties.sectionId)
      : undefined;

  if (byId) return byId.id;

  const textValue =
    typeof properties.section === 'string' ? properties.section : '';

  if (!textValue) return '';

  const normalized = normalizeReference(textValue);

  const exactName = sections.find(
    (section) => normalizeReference(section.name) === normalized,
  );

  if (exactName) return exactName.id;

  const sameMaterialSections = sections.filter(
    (section) =>
      !!resolvedMaterialId && section.materialId === resolvedMaterialId,
  );

  const containsMatch = sameMaterialSections.find((section) => {
    const candidate = normalizeReference(section.name);
    return candidate.includes(normalized) || normalized.includes(candidate);
  });

  if (containsMatch) return containsMatch.id;

  const anyContainsMatch = sections.find((section) => {
    const candidate = normalizeReference(section.name);
    return candidate.includes(normalized) || normalized.includes(candidate);
  });

  if (anyContainsMatch) return anyContainsMatch.id;

  return '';
}

function formatLoad(assignment: LoadAssignment): string {
  if (assignment.loadType === 'Joint Load') {
    return (
      'Fx=' + (assignment.fx ?? 0) + ' kN, ' +
      'Fy=' + (assignment.fy ?? 0) + ' kN, ' +
      'Fz=' + (assignment.fz ?? 0) + ' kN, ' +
      'Mx=' + (assignment.mx ?? 0) + ' kN·m, ' +
      'My=' + (assignment.my ?? 0) + ' kN·m, ' +
      'Mz=' + (assignment.mz ?? 0) + ' kN·m'
    );
  }

  if (assignment.loadType === 'Area Load') {
    return (
      'q=' + (assignment.pressure ?? 0) + ' kPa, ' +
      (assignment.direction ?? 'Global Z')
    );
  }

  if (assignment.loadType === 'Frame Point Load') {
    return (
      'P=' + (assignment.magnitudeStart ?? 0) + ' kN, ' +
      (assignment.direction ?? 'Global Z') +
      ', x=' + (assignment.distanceFromStart ?? 0) + ' m'
    );
  }

  return (
    'w=' +
    (assignment.magnitudeStart ?? 0) +
    ' → ' +
    (assignment.magnitudeEnd ?? assignment.magnitudeStart ?? 0) +
    ' kN/m, ' +
    (assignment.direction ?? 'Global Z')
  );
}

export function StructuralPropertyDialog({
  element,
  open,
  onOpenChange,
  scaleDenominator = 100,
  scaleNumerator = 1,
}: Props) {
  const dispatch = useAppDispatch();

  const materials = useAppSelector((state) => state.properties.materials);
  const sections = useAppSelector((state) => state.properties.sections);
  const loadCases = useAppSelector((state) => state.loads.loadCases);
  const assignments = useAppSelector((state) =>
    element
      ? state.loadAssignments.assignments.filter(
          (assignment) => assignment.targetId === element.id,
        )
      : [],
  );

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [assignLoadsOpen, setAssignLoadsOpen] = useState(false);

  const fields = useMemo(() => getElementFields(element), [element]);

  const resolvedMaterialId = useMemo(
    () => resolveMaterialId(element, materials),
    [element, materials],
  );

  const resolvedSectionId = useMemo(
    () =>
      resolveSectionId(
        element,
        sections,
        materials,
        resolvedMaterialId,
      ),
    [element, sections, materials, resolvedMaterialId],
  );

  const selectedMaterial = materials.find(
    (material) => material.id === selectedMaterialId,
  );

  const selectedSection = sections.find(
    (section) => section.id === selectedSectionId,
  );

  useEffect(() => {
    if (!element) return;

    const g: any = element.geometry;
    const p: any = element.properties;
    const data: Record<string, unknown> = {
      label: element.label,
      ...p,
    };

    if (element.type === 'column') {
      data.width = pagePtToRealMm(
        g.width,
        scaleNumerator,
        scaleDenominator,
      );
      data.depth = pagePtToRealMm(
        g.depth,
        scaleNumerator,
        scaleDenominator,
      );
      data.rotation = g.rotation;
    }

    if (element.type === 'beam') {
      data.width = pagePtToRealMm(
        g.width,
        scaleNumerator,
        scaleDenominator,
      );
      data.depth = pagePtToRealMm(
        g.depth,
        scaleNumerator,
        scaleDenominator,
      );
    }

    if (element.type === 'wall') {
      data.thickness = pagePtToRealMm(
        g.thickness,
        scaleNumerator,
        scaleDenominator,
      );
    }

    if (element.type === 'portalFrame') {
      data.height = pagePtToRealMm(
        g.height,
        scaleNumerator,
        scaleDenominator,
      );
      data.columnWidth = pagePtToRealMm(
        g.columnWidth,
        scaleNumerator,
        scaleDenominator,
      );
      data.columnDepth = pagePtToRealMm(
        g.columnDepth,
        scaleNumerator,
        scaleDenominator,
      );
      data.beamWidth = pagePtToRealMm(
        g.beamWidth,
        scaleNumerator,
        scaleDenominator,
      );
      data.beamDepth = pagePtToRealMm(
        g.beamDepth,
        scaleNumerator,
        scaleDenominator,
      );
    }

    if (element.type === 'slab') {
      data.thickness = p.thickness;
    }

    setDraft(
      Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
          key,
          String(value ?? ''),
        ]),
      ),
    );

    setSelectedMaterialId(resolvedMaterialId);
    setSelectedSectionId(resolvedSectionId);
  }, [
    element,
    scaleDenominator,
    scaleNumerator,
    resolvedMaterialId,
    resolvedSectionId,
  ]);

  if (!element) return null;

  const apply = () => {
    const g: any = { ...element.geometry };
    const p: any = { ...element.properties };

    for (const key of fields) {
      if (key === 'label') continue;
      if (!(key in draft)) continue;

      const value = numericFields.has(key)
        ? Number(draft[key])
        : draft[key];

      if (
        numericFields.has(key) &&
        (!Number.isFinite(value as number) || (value as number) < 0)
      ) {
        return;
      }

      if (pageGeometryFields.has(key) && key in g) {
        if (element.type === 'slab' && key === 'thickness') {
          p.thickness = value;
        } else {
          g[key] = realMmToPagePt(
            value as number,
            scaleNumerator,
            scaleDenominator,
          );
        }
      } else if (key in p) {
        p[key] = numericFields.has(key) ? Number(value) : value;
      }
    }

    p.label = draft.label || element.label;

    if (hasMaterial(element)) {
      const material = materials.find(
        (item) => item.id === selectedMaterialId,
      );

      if (material) {
        p.materialId = material.id;
        p.material = material.name;
      }
    }

    if (hasSection(element)) {
      const section = sections.find(
        (item) => item.id === selectedSectionId,
      );

      if (section) {
        p.sectionId = section.id;
        p.section = section.name;
      }
    }

    dispatch(
      updateShape({
        id: element.id,
        changes: {
          label: p.label,
          geometry: g,
          properties: p,
        },
      }),
    );

    onOpenChange(false);
  };

  const loadCaseName = (id: string) =>
    loadCases.find((item) => item.id === id)?.name ?? 'Unknown Load Case';

  const loadCaseIds = Array.from(
    new Set(assignments.map((assignment) => assignment.loadCaseId)),
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{element.type} Properties</DialogTitle>
          </DialogHeader>

          <div className="mb-2 text-xs text-muted-foreground">
            Geometric dimensions are displayed in real engineering millimetres.
            Drawing scale:{' '}
            <strong>
              {scaleNumerator === 1
                ? '1:' + scaleDenominator
                : scaleNumerator + ':' + scaleDenominator}
            </strong>
            . Viewer zoom is not part of engineering calculations.
          </div>

          <div className="grid grid-cols-2 gap-3">
            {fields.map((field) => (
              <div key={field} className="space-y-1">
                <label className="text-xs text-muted-foreground capitalize">
                  {field}
                </label>
                <Input
                  type={numericFields.has(field) ? 'number' : 'text'}
                  value={draft[field] ?? ''}
                  min={numericFields.has(field) ? 0 : undefined}
                  step={numericFields.has(field) ? 'any' : undefined}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      [field]: event.target.value,
                    }))
                  }
                />
              </div>
            ))}

            {hasMaterial(element) && (
              <div className="space-y-1">
                <Label className="text-xs">Material</Label>
                <Select
                  value={selectedMaterialId}
                  onValueChange={setSelectedMaterialId}
                >
                  <SelectTrigger className="h-9">
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
                {!selectedMaterial && (
                  <div className="text-[10px] text-amber-600">
                    Current material is not linked to the material library.
                  </div>
                )}
              </div>
            )}

            {hasSection(element) && (
              <div className="space-y-1">
                <Label className="text-xs">Section</Label>
                <Select
                  value={selectedSectionId}
                  onValueChange={setSelectedSectionId}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((section) => {
                      const material =
                        materials.find(
                          (item) => item.id === section.materialId,
                        )?.name ?? 'No Material';

                      return (
                        <SelectItem key={section.id} value={section.id}>
                          {section.name} · {material}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {!selectedSection && (
                  <div className="text-[10px] text-amber-600">
                    Current section is not linked to the section library.
                  </div>
                )}
              </div>
            )}
          </div>

          {hasSection(element) && selectedSection && (
            <div className="rounded-md border bg-muted/20 px-3 py-2 text-[10px]">
              <div className="font-semibold text-xs">
                Linked Section
              </div>
              <div className="mt-1 grid grid-cols-3 gap-2">
                <span>Area: {selectedSection.area.toFixed(1)} mm²</span>
                <span>Ix: {selectedSection.Ix.toExponential(3)} mm⁴</span>
                <span>Iy: {selectedSection.Iy.toExponential(3)} mm⁴</span>
              </div>
            </div>
          )}

          <div className="rounded-md border">
            <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
              <div className="text-xs font-semibold">
                Load Cases
              </div>
              <span className="text-[10px] text-muted-foreground">
                {loadCaseIds.length}
              </span>
            </div>

            <div className="p-3">
              {loadCaseIds.length === 0 ? (
                <div className="text-[11px] text-muted-foreground">
                  No load cases assigned to this object.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {loadCaseIds.map((loadCaseId) => (
                    <span
                      key={loadCaseId}
                      className="rounded bg-accent/10 px-2 py-1 text-[10px] font-medium text-accent-foreground"
                    >
                      {loadCaseName(loadCaseId)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-md border">
            <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
              <div className="text-xs font-semibold">
                Assigned Loads
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setAssignLoadsOpen(true)}
              >
                Assign Loads
              </Button>
            </div>

            <div className="max-h-48 overflow-y-auto">
              {assignments.length === 0 ? (
                <div className="p-3 text-[11px] text-muted-foreground">
                  No loads assigned to this object.
                </div>
              ) : (
                assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="border-b px-3 py-2 last:border-0"
                  >
                    <div className="text-[11px] font-medium">
                      {assignment.loadType}
                    </div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      {loadCaseName(assignment.loadCaseId)} ·{' '}
                      {formatLoad(assignment)}
                    </div>
                    {assignment.description && (
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        {assignment.description}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button onClick={apply}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AssignLoadsDialog
        open={assignLoadsOpen}
        onOpenChange={setAssignLoadsOpen}
        element={element}
      />
    </>
  );
}

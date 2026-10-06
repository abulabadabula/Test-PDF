import { useState, type ReactNode } from 'react';
import {
  Database,
  Box,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Folder,
  FolderOpen,
  UserRound,
} from 'lucide-react';
import { useAppSelector } from '@/app/store/hooks';
import type { Material, Section } from '@/app/store/slices/propertiesSlice';
import { sectionDimensionLabel, sectionTypeLabel } from '@/core/section/sectionGeometry';

function TreeBranch({
  id,
  label,
  count,
  depth,
  expanded,
  onToggle,
  children,
}: {
  id: string;
  label: string;
  count: number;
  depth: number;
  expanded: boolean;
  onToggle: (id: string) => void;
  children: ReactNode;
}) {
  const Icon = expanded ? FolderOpen : Folder;

  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-[11px] hover:bg-muted/70"
        style={{ paddingLeft: depth * 14 + 4 }}
      >
        {expanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span className="font-mono text-[10px] text-muted-foreground">{count}</span>
      </button>
      {expanded && children}
    </div>
  );
}

function MaterialNode({
  material,
  depth,
  expanded,
  onToggle,
}: {
  material: Material;
  depth: number;
  expanded: boolean;
  onToggle: (id: string) => void;
}) {
  const id = 'material:' + material.id;

  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-[11px] hover:bg-muted/70"
        style={{ paddingLeft: depth * 14 + 4 }}
      >
        {expanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
        <CircleDot className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">{material.name}</span>
      </button>
      {expanded && (
        <div
          className="mb-1 rounded border bg-muted/20 px-2 py-1.5 text-[10px]"
          style={{ marginLeft: depth * 14 + 28, marginRight: 8 }}
        >
          <div className="flex justify-between gap-2"><span className="text-muted-foreground">Type</span><span>{material.type}</span></div>
          <div className="flex justify-between gap-2"><span className="text-muted-foreground">E</span><span className="font-mono">{material.youngsModulus.toLocaleString()} MPa</span></div>
          <div className="flex justify-between gap-2"><span className="text-muted-foreground">ν</span><span className="font-mono">{material.poissonRatio}</span></div>
          <div className="flex justify-between gap-2"><span className="text-muted-foreground">Density</span><span className="font-mono">{material.density.toLocaleString()} kg/m³</span></div>
        </div>
      )}
    </div>
  );
}

function SectionNode({
  section,
  materialName,
  depth,
  expanded,
  onToggle,
}: {
  section: Section;
  materialName: string;
  depth: number;
  expanded: boolean;
  onToggle: (id: string) => void;
}) {
  const id = 'section:' + section.id;
  const dimensionEntries = Object.entries(section.dimensions);

  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-[11px] hover:bg-muted/70"
        style={{ paddingLeft: depth * 14 + 4 }}
      >
        {expanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
        <Box className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">{section.name}</span>
        <span className="font-mono text-[9px] text-muted-foreground">{sectionTypeLabel(section.type)}</span>
      </button>
      {expanded && (
        <div
          className="mb-1 rounded border bg-muted/20 px-2 py-1.5 text-[10px]"
          style={{ marginLeft: depth * 14 + 28, marginRight: 8 }}
        >
          <div className="flex justify-between gap-2"><span className="text-muted-foreground">Material</span><span className="truncate">{materialName}</span></div>
          <div className="flex justify-between gap-2"><span className="text-muted-foreground">Area</span><span className="font-mono">{section.area.toFixed(1)} mm²</span></div>
          <div className="flex justify-between gap-2"><span className="text-muted-foreground">Ix</span><span className="font-mono">{section.Ix.toExponential(3)} mm⁴</span></div>
          <div className="flex justify-between gap-2"><span className="text-muted-foreground">Iy</span><span className="font-mono">{section.Iy.toExponential(3)} mm⁴</span></div>
          {dimensionEntries.map(([key, value]) => (
            <div key={key} className="flex justify-between gap-2">
              <span className="text-muted-foreground">{sectionDimensionLabel(key)}</span>
              <span className="font-mono">{value.toLocaleString()} mm</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PropertiesLibraryTree() {
  const materials = useAppSelector((s) => s.properties.materials);
  const sections = useAppSelector((s) => s.properties.sections);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(['materials', 'default-materials', 'sections', 'default-sections']),
  );

  const toggle = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const defaultMaterials = materials.filter((material) => material.source !== 'user');
  const userMaterials = materials.filter((material) => material.source === 'user');
  const defaultSections = sections.filter((section) => section.source !== 'user');
  const userSections = sections.filter((section) => section.source === 'user');

  const materialName = (materialId: string) =>
    materials.find((material) => material.id === materialId)?.name || 'Unassigned material';

  return (
    <div className="rounded-md border border-border bg-background overflow-hidden">
      <div className="border-b border-border bg-muted/30 px-2.5 py-2 text-xs font-semibold">
        Material & Section Library
      </div>

      <TreeBranch
        id="materials"
        label="Materials"
        count={materials.length}
        depth={0}
        expanded={expanded.has('materials')}
        onToggle={toggle}
      >
        <TreeBranch
          id="default-materials"
          label="Default Materials"
          count={defaultMaterials.length}
          depth={1}
          expanded={expanded.has('default-materials')}
          onToggle={toggle}
        >
          {defaultMaterials.length ? defaultMaterials.map((material) => (
            <MaterialNode
              key={material.id}
              material={material}
              depth={2}
              expanded={expanded.has('material:' + material.id)}
              onToggle={toggle}
            />
          )) : <div className="px-2 py-1 text-[10px] text-muted-foreground" style={{ paddingLeft: 2 * 14 + 30 }}>None</div>}
        </TreeBranch>

        <TreeBranch
          id="user-materials"
          label="User-defined Materials"
          count={userMaterials.length}
          depth={1}
          expanded={expanded.has('user-materials')}
          onToggle={toggle}
        >
          {userMaterials.length ? userMaterials.map((material) => (
            <MaterialNode
              key={material.id}
              material={material}
              depth={2}
              expanded={expanded.has('material:' + material.id)}
              onToggle={toggle}
            />
          )) : <div className="px-2 py-1 text-[10px] text-muted-foreground" style={{ paddingLeft: 2 * 14 + 30 }}>None</div>}
        </TreeBranch>
      </TreeBranch>

      <div className="border-t border-border" />

      <TreeBranch
        id="sections"
        label="Sections"
        count={sections.length}
        depth={0}
        expanded={expanded.has('sections')}
        onToggle={toggle}
      >
        <TreeBranch
          id="default-sections"
          label="Default Sections"
          count={defaultSections.length}
          depth={1}
          expanded={expanded.has('default-sections')}
          onToggle={toggle}
        >
          {defaultSections.length ? defaultSections.map((section) => (
            <SectionNode
              key={section.id}
              section={section}
              materialName={materialName(section.materialId)}
              depth={2}
              expanded={expanded.has('section:' + section.id)}
              onToggle={toggle}
            />
          )) : <div className="px-2 py-1 text-[10px] text-muted-foreground" style={{ paddingLeft: 2 * 14 + 30 }}>None</div>}
        </TreeBranch>

        <TreeBranch
          id="user-sections"
          label="User-defined Sections"
          count={userSections.length}
          depth={1}
          expanded={expanded.has('user-sections')}
          onToggle={toggle}
        >
          {userSections.length ? userSections.map((section) => (
            <SectionNode
              key={section.id}
              section={section}
              materialName={materialName(section.materialId)}
              depth={2}
              expanded={expanded.has('section:' + section.id)}
              onToggle={toggle}
            />
          )) : <div className="px-2 py-1 text-[10px] text-muted-foreground" style={{ paddingLeft: 2 * 14 + 30 }}>None</div>}
        </TreeBranch>
      </TreeBranch>

      <div className="border-t border-border px-2 py-1.5 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Database className="h-3 w-3" />
          Default items are built in; items created from the Material or Section menus are user-defined.
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <UserRound className="h-3 w-3" />
          Section material links are retained by material ID.
        </div>
      </div>
    </div>
  );
}

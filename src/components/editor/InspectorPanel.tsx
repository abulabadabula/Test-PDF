import { useMemo } from 'react';
import { useAppSelector } from '@/app/store/hooks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TreeViewPanel } from '@/features/tree-view/TreeViewPanel';
import { LayerPanel } from '@/features/layers/LayerPanel';
import { PropertiesLibraryTree } from '@/components/properties/PropertiesLibraryTree';
import { Layers, TreePine, Sliders } from 'lucide-react';

const normalizeName = (value: string) =>
  value.toLowerCase().replace(/[×x\s_\-]/g, '');

export function InspectorPanel() {
  const shapes = useAppSelector((state) => state.drawing.shapes);
  const selectedIds = useAppSelector((state) => state.drawing.selectedShapeIds);

  const selectedPropertyRefs = useMemo(() => {
    const selected = shapes.find(
      (shape) => selectedIds.includes(shape.id) && 'geometry' in shape,
    ) as any;

    if (!selected) {
      return {
        materialId: undefined,
        sectionId: undefined,
        materialName: undefined,
        sectionName: undefined,
      };
    }

    let source = selected;

    if (selected.type === 'node') {
      const connected = shapes.find((shape: any) => {
        if (!('geometry' in shape) || shape.type === 'node') return false;
        const p = shape.properties ?? {};

        return (
          p.nodeId === selected.id ||
          p.startNodeId === selected.id ||
          p.endNodeId === selected.id ||
          p.nodeId === selected.label ||
          p.startNodeId === selected.label ||
          p.endNodeId === selected.label
        );
      });

      if (connected) source = connected;
    }

    const properties = source.properties ?? {};

    return {
      materialId:
        typeof properties.materialId === 'string'
          ? properties.materialId
          : undefined,
      sectionId:
        typeof properties.sectionId === 'string'
          ? properties.sectionId
          : undefined,
      materialName:
        typeof properties.material === 'string'
          ? properties.material
          : undefined,
      sectionName:
        typeof properties.section === 'string'
          ? properties.section
          : undefined,
    };
  }, [shapes, selectedIds]);

  const materialId = useAppSelector((state) => {
    const ref = selectedPropertyRefs;

    if (ref.materialId && state.properties.materials.some((item) => item.id === ref.materialId)) {
      return ref.materialId;
    }

    if (!ref.materialName) return undefined;

    const exact = state.properties.materials.find(
      (material) =>
        material.name.toLowerCase() === ref.materialName!.toLowerCase(),
    );

    if (exact) return exact.id;

    return state.properties.materials.find(
      (material) =>
        material.type.toLowerCase() === ref.materialName!.toLowerCase(),
    )?.id;
  });

  const sectionId = useAppSelector((state) => {
    const ref = selectedPropertyRefs;

    if (ref.sectionId && state.properties.sections.some((item) => item.id === ref.sectionId)) {
      return ref.sectionId;
    }

    if (!ref.sectionName) return undefined;

    const normalized = normalizeName(ref.sectionName);

    const exact = state.properties.sections.find(
      (section) => normalizeName(section.name) === normalized,
    );

    if (exact) return exact.id;

    return state.properties.sections.find((section) => {
      const candidate = normalizeName(section.name);
      return candidate.startsWith(normalized) || normalized.startsWith(candidate);
    })?.id;
  });

  return (
    <div className="h-full flex flex-col bg-editor-panel border-l border-border">
      <Tabs defaultValue="layers" className="flex flex-col h-full">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-10 px-2 gap-1">
          <TabsTrigger value="layers" className="text-xs gap-1.5 data-[state=active]:bg-editor-active data-[state=active]:text-accent">
            <TreePine className="w-3.5 h-3.5" /> Structure
          </TabsTrigger>
          <TabsTrigger value="properties" className="text-xs gap-1.5 data-[state=active]:bg-editor-active data-[state=active]:text-accent">
            <Sliders className="w-3.5 h-3.5" /> Properties
          </TabsTrigger>
          <TabsTrigger value="tree" className="text-xs gap-1.5 data-[state=active]:bg-editor-active data-[state=active]:text-accent">
            <Layers className="w-3.5 h-3.5" /> Layers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="layers" className="flex-1 overflow-y-auto mt-0 p-2">
          <TreeViewPanel />
        </TabsContent>

        <TabsContent value="properties" className="flex-1 min-h-0 overflow-y-auto mt-0 p-2">
          <PropertiesLibraryTree
            selectedMaterialId={materialId}
            selectedSectionId={sectionId}
          />
        </TabsContent>

        <TabsContent value="tree" className="flex-1 overflow-y-auto mt-0 p-2">
          <LayerPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

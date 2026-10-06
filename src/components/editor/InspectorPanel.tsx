import { useMemo } from 'react';
import { useAppSelector } from '@/app/store/hooks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TreeViewPanel } from '@/features/tree-view/TreeViewPanel';
import { LayerPanel } from '@/features/layers/LayerPanel';
import { PropertiesLibraryTree } from '@/components/properties/PropertiesLibraryTree';
import { Layers, TreePine, Sliders } from 'lucide-react';

const normalizeName = (value: string) => value.toLowerCase().replace(/[×x\s_\-]/g, '');

export function InspectorPanel() {
  const shapes = useAppSelector((state) => state.drawing.shapes);
  const selectedIds = useAppSelector((state) => state.drawing.selectedShapeIds);

  const selectedPropertyNames = useMemo(() => {
    const selected = shapes.find((shape) => selectedIds.includes(shape.id) && 'geometry' in shape) as any;
    if (!selected) return { materialName: undefined, sectionName: undefined };

    let source = selected;

    // Nodes have no material/section of their own. Use the first connected
    // structural member so selecting a node highlights its assigned properties.
    if (selected.type === 'node') {
      const connected = shapes.find((shape: any) => {
        if (!('geometry' in shape) || shape.type === 'node') return false;
        const p = shape.properties ?? {};
        return p.nodeId === selected.id || p.startNodeId === selected.id || p.endNodeId === selected.id || p.nodeId === selected.label || p.startNodeId === selected.label || p.endNodeId === selected.label;
      });
      if (connected) source = connected;
    }

    return {
      materialName: typeof source.properties?.material === 'string' ? source.properties.material : undefined,
      sectionName: typeof source.properties?.section === 'string' ? source.properties.section : undefined,
    };
  }, [shapes, selectedIds]);

  const materialId = useAppSelector((state) => {
    const name = selectedPropertyNames.materialName;
    if (!name) return undefined;
    const exact = state.properties.materials.find((material) => material.name === name);
    if (exact) return exact.id;
    const byType = state.properties.materials.find((material) => material.type.toLowerCase() === name.toLowerCase());
    return byType?.id;
  });

  const sectionId = useAppSelector((state) => {
    const name = selectedPropertyNames.sectionName;
    if (!name) return undefined;
    const exact = state.properties.sections.find((section) => section.name === name);
    if (exact) return exact.id;
    const normalized = normalizeName(name);
    return state.properties.sections.find((section) => {
      const candidate = normalizeName(section.name);
      return candidate.startsWith(normalized) || normalized.startsWith(candidate);
    })?.id;
  });

  return (
    <div className="h-full flex flex-col bg-editor-panel border-l border-border">
      <Tabs defaultValue="layers" className="flex flex-col h-full">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-10 px-2 gap-1">
          <TabsTrigger value="layers" className="text-xs gap-1.5 data-[state=active]:bg-editor-active data-[state=active]:text-accent"><TreePine className="w-3.5 h-3.5" /> Structure</TabsTrigger>
          <TabsTrigger value="properties" className="text-xs gap-1.5 data-[state=active]:bg-editor-active data-[state=active]:text-accent"><Sliders className="w-3.5 h-3.5" /> Properties</TabsTrigger>
          <TabsTrigger value="tree" className="text-xs gap-1.5 data-[state=active]:bg-editor-active data-[state=active]:text-accent"><Layers className="w-3.5 h-3.5" /> Layers</TabsTrigger>
        </TabsList>
        <TabsContent value="layers" className="flex-1 overflow-y-auto mt-0 p-2"><TreeViewPanel /></TabsContent>
        <TabsContent value="properties" className="flex-1 min-h-0 overflow-y-auto mt-0 p-2"><PropertiesLibraryTree selectedMaterialId={materialId} selectedSectionId={sectionId} /></TabsContent>
        <TabsContent value="tree" className="flex-1 overflow-y-auto mt-0 p-2"><LayerPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

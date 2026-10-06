import { useMemo } from 'react';
import { useAppSelector } from '@/app/store/hooks';
import { TreeViewPanel } from '@/features/tree-view/TreeViewPanel';
import { LayerPanel } from '@/features/layers/LayerPanel';
import { PropertiesLibraryTree } from '@/components/properties/PropertiesLibraryTree';
import { Layers, TreePine, Sliders } from 'lucide-react';

export function InspectorPanel() {
  const shapes = useAppSelector((state) => state.drawing.shapes);
  const selectedIds = useAppSelector((state) => state.drawing.selectedShapeIds);

  const selectedPropertyIds = useMemo(() => {
    const selected = shapes.find((shape) => selectedIds.includes(shape.id) && 'geometry' in shape) as any;
    if (!selected) return { materialId: undefined, sectionId: undefined };

    let source = selected;

    // Nodes do not own material/section data. For a node selection, use the
    // first connected structural member so the Properties tab still shows
    // the engineering properties associated with that node.
    if (selected.type === 'node') {
      const connected = shapes.find((shape: any) => {
        if (!('geometry' in shape) || shape.type === 'node') return false;
        const p = shape.properties ?? {};
        return p.nodeId === selected.id || p.startNodeId === selected.id || p.endNodeId === selected.id || p.nodeId === selected.label || p.startNodeId === selected.label || p.endNodeId === selected.label;
      });
      if (connected) source = connected;
    }

    const materialName = source.properties?.material;
    const sectionName = source.properties?.section;
    const material = typeof materialName === 'string'
      ? shapes.length >= 0 ? undefined : undefined
      : undefined;

    return {
      materialId: typeof materialName === 'string' ? materialName : undefined,
      sectionId: typeof sectionName === 'string' ? sectionName : undefined,
    };
  }, [shapes, selectedIds]);

  const materialId = useAppSelector((state) => {
    const name = selectedPropertyIds.materialId;
    return name ? state.properties.materials.find((material) => material.name === name)?.id : undefined;
  });

  const sectionId = useAppSelector((state) => {
    const name = selectedPropertyIds.sectionId;
    return name ? state.properties.sections.find((section) => section.name === name)?.id : undefined;
  });

  return (
    <div className="h-full flex flex-col bg-editor-panel border-l border-border">
      <TabsContainer
        materialId={materialId}
        sectionId={sectionId}
      />
    </div>
  );
}

function TabsContainer({ materialId, sectionId }: { materialId?: string; sectionId?: string }) {
  return (
    <TabsRoot materialId={materialId} sectionId={sectionId} />
  );
}

function TabsRoot({ materialId, sectionId }: { materialId?: string; sectionId?: string }) {
  const { Tabs, TabsContent, TabsList, TabsTrigger } = require('@/components/ui/tabs') as typeof import('@/components/ui/tabs');

  return (
    <Tabs defaultValue="layers" className="flex flex-col h-full">
      <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-10 px-2 gap-1">
        <TabsTrigger value="layers" className="text-xs gap-1.5 data-[state=active]:bg-editor-active data-[state=active]:text-accent"><TreePine className="w-3.5 h-3.5" /> Structure</TabsTrigger>
        <TabsTrigger value="properties" className="text-xs gap-1.5 data-[state=active]:bg-editor-active data-[state=active]:text-accent"><Sliders className="w-3.5 h-3.5" /> Properties</TabsTrigger>
        <TabsTrigger value="tree" className="text-xs gap-1.5 data-[state=active]:bg-editor-active data-[state=active]:text-accent"><Layers className="w-3.5 h-3.5" /> Layers</TabsTrigger>
      </TabsList>
      <TabsContent value="layers" className="flex-1 overflow-y-auto mt-0 p-2"><TreeViewPanel /></TabsContent>
      <TabsContent value="properties" className="flex-1 min-h-0 overflow-hidden mt-0 p-2">
        <PropertiesLibraryTree selectedMaterialId={materialId} selectedSectionId={sectionId} />
      </TabsContent>
      <TabsContent value="tree" className="flex-1 overflow-y-auto mt-0 p-2"><LayerPanel /></TabsContent>
    </Tabs>
  );
}

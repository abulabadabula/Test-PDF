import { useAppSelector } from '@/app/store/hooks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayerPanel } from '@/features/layers/LayerPanel';
import { TreeViewPanel } from '@/features/tree-view/TreeViewPanel';
import { SelectedObjectProperties } from '@/components/properties/SelectedObjectProperties';
import { PropertiesLibraryTree } from '@/components/properties/PropertiesLibraryTree';
import { Layers, TreePine, Sliders } from 'lucide-react';

export function InspectorPanel() {
  const hasStructuralSelection = useAppSelector((state) => {
    const selected = new Set(state.drawing.selectedShapeIds);
    return state.drawing.shapes.some((shape) => selected.has(shape.id) && 'geometry' in shape);
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

        <TabsContent value="properties" className="flex-1 min-h-0 overflow-hidden mt-0">
          <div className="flex h-full min-h-0 flex-col">
            {hasStructuralSelection && (
              <div className="max-h-[48%] min-h-0 overflow-y-auto border-b border-border">
                <SelectedObjectProperties />
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              <PropertiesLibraryTree />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tree" className="flex-1 overflow-y-auto mt-0 p-2">
          <LayerPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

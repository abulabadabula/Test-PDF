import { useAppSelector, useAppDispatch } from '@/app/store/hooks';
import { addLayer, toggleDimensions, toggleLegend, reorderLayer, updateLayer } from '@/app/store/slices/layerSlice';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { LayerItem } from './LayerItem';
import { LayerControls } from './LayerControls';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Plus, Eye, EyeOff } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export function LayerPanel() {
  const dispatch = useAppDispatch();
  const layers = useAppSelector(state => state.layer.layers);
  const showDimensions = useAppSelector(state => state.layer.showDimensions);
  const showLegend = useAppSelector(state => state.layer.showLegend);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleAddLayer = () => {
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];
    const color = colors[layers.length % colors.length];
    dispatch(addLayer({ name: `图层 ${layers.length + 1}`, color }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = layers.findIndex(l => l.id === active.id);
      const newIndex = layers.findIndex(l => l.id === over.id);
      const newLayers = arrayMove(layers, oldIndex, newIndex);
      // 同步更新 Redux 中的 order 属性
      newLayers.forEach((l, i) => dispatch(reorderLayer({ id: l.id, newOrder: i })));
    }
  };

  const toggleAllVisibility = (visible: boolean) => {
    layers.forEach(l => {
      if (l.visible !== visible) dispatch(updateLayer({ id: l.id, changes: { visible } }));
    });
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <h3 className="font-semibold text-sm">Layer Management</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleAddLayer}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={layers.map(l => l.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1">
              {layers.map(layer => (
                <LayerItem key={layer.id} layer={layer} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <Separator className="bg-gray-100" />

      <div className="p-3 space-y-3 bg-gray-50/30">
        <LayerControls />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">显示尺寸标注</span>
          <Switch checked={showDimensions} onCheckedChange={() => dispatch(toggleDimensions())} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">显示图例面板</span>
          <Switch checked={showLegend} onCheckedChange={() => dispatch(toggleLegend())} />
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" className="flex-1 text-xs h-7" onClick={() => toggleAllVisibility(true)}>
            <Eye className="h-3 w-3 mr-1" /> 全显
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-xs h-7" onClick={() => toggleAllVisibility(false)}>
            <EyeOff className="h-3 w-3 mr-1" /> 全隐
          </Button>
        </div>
      </div>
    </div>
  );
}
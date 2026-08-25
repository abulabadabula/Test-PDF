import { useAppSelector, useAppDispatch } from '@/app/store/hooks';
import { updateLayer } from '@/app/store/slices/layerSlice';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

export function LayerControls() {
  const dispatch = useAppDispatch();
  const activeLayer = useAppSelector(state => state.layer.layers.find(l => l.id === state.layer.activeLayerId));

  if (!activeLayer) return null;

  return (
    <div className="space-y-2 p-2 bg-gray-50 rounded-md">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-gray-500">current layer opacity</Label>
        <span className="text-xs font-mono">{Math.round(activeLayer.opacity * 100)}%</span>
      </div>
      <Slider 
        value={[activeLayer.opacity]} 
        min={0} max={1} step={0.05} 
        onValueChange={v => dispatch(updateLayer({ id: activeLayer.id, changes: { opacity: v[0] } }))} 
      />
    </div>
  );
}
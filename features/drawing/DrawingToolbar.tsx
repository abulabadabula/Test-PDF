import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { setActiveTool, setStrokeColor, setFillColor, setStrokeWidth, setOpacity, setFontSize, setScaleRatio } from '@/app/store/slices/drawingSlice';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  MousePointer2, CircleDot, Minus, Share2, Pentagon, Square, Circle, 
  Type, Ruler, Eraser 
} from 'lucide-react';

const tools = [
  { id: 'select', icon: MousePointer2, name: '选择', key: 'V' },
  { id: 'point', icon: CircleDot, name: '点', key: 'P' },
  { id: 'line', icon: Minus, name: '直线', key: 'L' },
  { id: 'polyline', icon: Share2, name: '折线', key: 'PL' },
  { id: 'polygon', icon: Pentagon, name: '多边形', key: 'PG' },
  { id: 'rectangle', icon: Square, name: '矩形', key: 'R' },
  { id: 'circle', icon: Circle, name: '圆', key: 'C' },
  { id: 'text', icon: Type, name: '文字', key: 'T' },
  { id: 'measure', icon: Ruler, name: '测量', key: 'M' },
  { id: 'eraser', icon: Eraser, name: '橡皮擦', key: 'E' },
];

export function DrawingToolbar() {
  const dispatch = useAppDispatch();
  const activeTool = useAppSelector(state => state.drawing.activeTool);
  const strokeColor = useAppSelector(state => state.drawing.currentStrokeColor);
  const fillColor = useAppSelector(state => state.drawing.currentFillColor);
  const strokeWidth = useAppSelector(state => state.drawing.currentStrokeWidth);
  const opacity = useAppSelector(state => state.drawing.currentOpacity);
  const fontSize = useAppSelector(state => state.drawing.currentFontSize);
  const { scaleNumerator, scaleDenominator, scaleUnit } = useAppSelector(state => state.drawing);

  return (

    <div className="flex flex-col w-14 bg-white border-r shadow-sm z-30 overflow-y-auto">
      {/* 工具列表 */}
      <div className="flex flex-col items-center gap-1 p-2">
        {tools.map(t => (
          <Tooltip key={t.id}>
            <TooltipTrigger asChild>
              <Button
                variant={activeTool === t.id ? 'default' : 'ghost'}
                size="icon"
                className="h-9 w-9"
                onClick={() => dispatch(setActiveTool(t.id as any))}
              >
                <t.icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{t.name} ({t.key})</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      <Separator />

      {/* 属性面板 */}
      <div className="p-2 flex flex-col gap-3 text-xs">
        <div className="flex flex-col gap-1">
          <label className="text-gray-500">描边</label>
          <Input type="color" value={strokeColor} onChange={e => dispatch(setStrokeColor(e.target.value))} className="h-8 p-1 cursor-pointer" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-500">填充</label>
          <Input type="color" value={fillColor === 'transparent' ? '#ffffff' : fillColor} onChange={e => dispatch(setFillColor(e.target.value))} className="h-8 p-1 cursor-pointer" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-500">线宽: {strokeWidth}</label>
          <Slider value={[strokeWidth]} min={1} max={10} step={1} onValueChange={v => dispatch(setStrokeWidth(v[0]))} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-500">透明: {Math.round(opacity * 100)}%</label>
          <Slider value={[opacity]} min={0} max={1} step={0.1} onValueChange={v => dispatch(setOpacity(v[0]))} />
        </div>
        {activeTool === 'text' && (
          <div className="flex flex-col gap-1">
            <label className="text-gray-500">字号</label>
            <Input type="number" value={fontSize} onChange={e => dispatch(setFontSize(parseFloat(e.target.value)))} className="h-8" />
          </div>
        )}
      </div>

      <Separator />

      {/* 比例尺 */}
      <div className="p-2 flex flex-col gap-2 text-xs">
        <label className="text-gray-500 font-semibold">比例尺</label>
        <div className="flex gap-1">
          <Input type="number" value={scaleNumerator} onChange={e => dispatch(setScaleRatio({ num: parseFloat(e.target.value) || 1, den: scaleDenominator, unit: scaleUnit }))} className="h-7 w-12" />
          <span className="self-center">:</span>
          <Input type="number" value={scaleDenominator} onChange={e => dispatch(setScaleRatio({ num: scaleNumerator, den: parseFloat(e.target.value) || 100, unit: scaleUnit }))} className="h-7 w-12" />
        </div>
        <Input value={scaleUnit} onChange={e => dispatch(setScaleRatio({ num: scaleNumerator, den: scaleDenominator, unit: e.target.value }))} className="h-7" />
      </div>
    </div>

  );
}

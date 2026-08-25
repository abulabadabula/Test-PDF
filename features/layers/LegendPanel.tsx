import { useState, useRef, useCallback, useEffect } from 'react';
import { useAppSelector } from '@/app/store/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, GripHorizontal } from 'lucide-react';
import { 
  CircleDot, Minus, Share2, Pentagon, Square, Circle, Type, Ruler 
} from 'lucide-react';

const typeIcons: Record<string, any> = {
  point: CircleDot, line: Minus, polyline: Share2, polygon: Pentagon,
  rectangle: Square, circle: Circle, text: Type, measure: Ruler
};

export function LegendPanel() {
  const showLegend = useAppSelector(state => state.layer.showLegend);
  const layers = useAppSelector(state => state.layer.layers);
  const shapes = useAppSelector(state => state.drawing.shapes);
  const currentPage = useAppSelector(state => state.pdf.currentPage);

  const [pos, setPos] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, mouseX: 0, mouseY: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const pageShapes = shapes.filter(s => s.pageIndex === currentPage);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: pos.x, y: pos.y, mouseX: e.clientX, mouseY: e.clientY };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - dragStart.current.mouseX;
        const dy = e.clientY - dragStart.current.mouseY;
        setPos({ x: dragStart.current.x + dx, y: dragStart.current.y + dy });
      }
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // 导出图例为图片
  const exportImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const padding = 20;
    const lineHeight = 24;
    const width = 220;
    const height = padding * 2 + layers.length * lineHeight + 30;

    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    ctx.fillStyle = '#111827';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('图例 (Legend)', padding, padding + 16);

    ctx.font = '14px sans-serif';
    layers.forEach((layer, i) => {
      const y = padding + 40 + i * lineHeight;
      const layerShapes = pageShapes.filter(s => s.layerId === layer.id);
      
      ctx.fillStyle = layer.color;
      ctx.fillRect(padding, y - 10, 16, 16);
      
      ctx.fillStyle = '#374151';
      ctx.fillText(`${layer.name} (${layerShapes.length})`, padding + 24, y + 2);
      
      let iconX = width - padding;
      const types = Array.from(new Set(layerShapes.map(s => s.type)));
      types.forEach(type => {
        iconX -= 20;
        ctx.fillStyle = layer.color;
        ctx.beginPath();
        if (type === 'circle' || type === 'point') {
          ctx.arc(iconX + 6, y - 2, 5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.rect(iconX, y - 8, 12, 12);
          ctx.fill();
        }
      });
    });

    const link = document.createElement('a');
    link.download = 'legend.png';
    link.href = canvas.toDataURL();
    link.click();
  }, [layers, pageShapes]);

  if (!showLegend) return null;

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />
      <Card 
        className="absolute z-40 shadow-lg w-64 select-none" 
        style={{ right: pos.x, bottom: pos.y, cursor: isDragging ? 'grabbing' : 'default' }}
      >
        <CardHeader 
          className="p-2 border-b cursor-grab active:cursor-grabbing flex flex-row items-center justify-between"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <GripHorizontal className="h-4 w-4 text-gray-400" />
            <CardTitle className="text-sm">图例</CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={exportImage}>
            <Download className="h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent className="p-2 max-h-60 overflow-y-auto">
          <div className="space-y-1">
            {layers.map(layer => {
              const layerShapes = pageShapes.filter(s => s.layerId === layer.id);
              const types = Array.from(new Set(layerShapes.map(s => s.type)));
              
              return (
                <div key={layer.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: layer.color }} />
                  <span className="text-xs font-medium flex-1 truncate">{layer.name}</span>
                  <span className="text-[10px] text-gray-500">{layerShapes.length}</span>
                  <div className="flex gap-1">
                    {types.map(t => {
                      const Icon = typeIcons[t] || Square;
                      return <Icon key={t} className="h-3 w-3" style={{ color: layer.color }} />;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
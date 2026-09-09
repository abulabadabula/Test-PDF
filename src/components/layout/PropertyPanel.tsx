// src/components/layout/PropertyPanel.tsx
import { useState, useRef } from 'react';
import { useAppSelector } from '@/app/store/hooks';
import { selectSelectedShapes } from '@/app/store/slices/drawingSlice';
import { pagePtToRealMm } from '@/core/coordinate/engineeringScale';
import { X, Box, Anchor, Layers, Weight } from 'lucide-react';

export function PropertyPanel() {
  const [width, setWidth] = useState(280);
  const isResizing = useRef(false);
  const selectedShapes = useAppSelector(selectSelectedShapes);
  const scaleNumerator = useAppSelector((s) => s.pageCoordinate.pages[s.pageCoordinate.currentPage]?.scaleNumerator || 1);
  const scaleDenominator = useAppSelector((s) => s.pageCoordinate.pages[s.pageCoordinate.currentPage]?.scaleDenominator || 100);

  // 轻量级拖拽调整宽度逻辑
  const handleMouseDown = () => { isResizing.current = true; };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = e.clientX;
    if (newWidth > 200 && newWidth < 500) setWidth(newWidth);
  };
  const handleMouseUp = () => { isResizing.current = false; };

  if (selectedShapes.length === 0) {
    return (
      <div 
        className="h-full bg-background border-r flex flex-col" 
        style={{ width: `${width}px` }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-semibold text-sm">Properties</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-4 text-center">
          Select an element in the TreeView or Canvas to view its properties.
        </div>
        {/* Resize Handle */}
        <div 
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors"
          onMouseDown={handleMouseDown}
        />
      </div>
    );
  }

  const shape = selectedShapes[0]; // 当前以单选为主，如需多选可扩展
  const isStructural = 'geometry' in shape;
  const g = isStructural ? (shape.geometry as any) : {};
  const p = isStructural ? (shape.properties as any) : {};

  // 辅助函数：安全地将页面单位转换为真实毫米
  const toMm = (val: number) => pagePtToRealMm(val, scaleNumerator, scaleDenominator).toFixed(1);

  return (
    <div 
      className="h-full bg-background border-r flex flex-col relative" 
      style={{ width: `${width}px` }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="p-3 border-b flex justify-between items-center bg-muted/30">
        <h3 className="font-semibold text-sm capitalize">{shape.type} Properties</h3>
        <span className="text-xs font-mono text-muted-foreground">{shape.label}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* 1. 几何信息 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
            <Box className="w-3 h-3" /> Geometry
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {shape.type === 'column' && (
              <>
                <div className="text-muted-foreground">Width:</div><div className="text-right font-mono">{toMm(g.width)} mm</div>
                <div className="text-muted-foreground">Depth:</div><div className="text-right font-mono">{toMm(g.depth)} mm</div>
                <div className="text-muted-foreground">Rotation:</div><div className="text-right font-mono">{g.rotation}°</div>
              </>
            )}
            {shape.type === 'beam' && (
              <>
                <div className="text-muted-foreground">Width:</div><div className="text-right font-mono">{toMm(g.width)} mm</div>
                <div className="text-muted-foreground">Depth:</div><div className="text-right font-mono">{toMm(g.depth)} mm</div>
              </>
            )}
            {shape.type === 'wall' && (
              <>
                <div className="text-muted-foreground">Thickness:</div><div className="text-right font-mono">{toMm(g.thickness)} mm</div>
              </>
            )}
            {/* 可根据需要添加 slab, portalFrame 等 */}
          </div>
        </div>

        {/* 2. 约束条件 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
            <Anchor className="w-3 h-3" /> Constraints
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted-foreground">Start Node:</div>
            <div className="text-right font-mono">{p.startNodeId || 'None'}</div>
            <div className="text-muted-foreground">End Node:</div>
            <div className="text-right font-mono">{p.endNodeId || 'None'}</div>
          </div>
        </div>

        {/* 3. 材料和截面 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
            <Layers className="w-3 h-3" /> Material & Section
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted-foreground">Material:</div>
            <div className="text-right font-mono">{p.material || 'Unassigned'}</div>
            <div className="text-muted-foreground">Section:</div>
            <div className="text-right font-mono">{p.section || 'Unassigned'}</div>
          </div>
        </div>

        {/* 4. 荷载与其他属性 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
            <Weight className="w-3 h-3" /> Loads & Others
          </div>
          <div className="text-sm text-muted-foreground italic">
            {Object.keys(p).filter(k => !['label', 'material', 'section', 'startNodeId', 'endNodeId', 'thickness', 'level'].includes(k)).length > 0 
              ? Object.entries(p).filter(([k]) => !['label', 'material', 'section', 'startNodeId', 'endNodeId', 'thickness', 'level'].includes(k)).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-2 gap-2 mb-1">
                    <span className="capitalize">{k}:</span>
                    <span className="text-right font-mono">{String(v)}</span>
                  </div>
                ))
              : 'No additional loads or properties defined.'}
          </div>
        </div>
      </div>

      {/* Resize Handle */}
      <div 
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 transition-colors z-50"
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}
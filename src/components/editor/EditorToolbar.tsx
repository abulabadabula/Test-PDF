import React from 'react';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { setActiveTool, ToolType } from '@/app/store/slices/drawingSlice';
import { MousePointer2, Columns3, Minus, BrickWall, Layers3, Warehouse, Ruler, Magnet, 
} from 'lucide-react';
import { toggleSnap, toggleSnapType } from '@/app/store/slices/uiSlice';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const TOOLS: { id: ToolType; label: string; icon: React.ReactNode; shortcut: string }[] = [
  { id: 'select', label: 'Select', icon: <MousePointer2 className="w-4 h-4" />, shortcut: 'V' },
  { id: 'column', label: 'Column', icon: <Columns3 className="w-4 h-4" />, shortcut: 'C' },
  { id: 'beam', label: 'Beam', icon: <Minus className="w-4 h-4" />, shortcut: 'B' },
  { id: 'wall', label: 'Wall', icon: <BrickWall className="w-4 h-4" />, shortcut: 'W' },
  { id: 'slab', label: 'Slab', icon: <Layers3 className="w-4 h-4" />, shortcut: 'S' },
  { id: 'rectSlab', label: 'Rect Slab', icon: <Layers3 className="w-4 h-4" />, shortcut: 'F' },
  { id: 'portalFrame', label: 'Portal Frame', icon: <Warehouse className="w-4 h-4" />, shortcut: 'P' },
  { id: 'measure', label: 'Measure', icon: <Ruler className="w-4 h-4" />, shortcut: 'M' },
];

export function EditorToolbar() {
  const dispatch = useAppDispatch();
  const active = useAppSelector((s) => s.drawing.activeTool);
  const snap = useAppSelector((s) => s.ui.snapEnabled);
  const types = useAppSelector((s) => s.ui.snapTypes);

  const snapButtons: [keyof typeof types, string][] = [
    ['grid', 'Grid'],
    ['endpoint', 'End'],
    ['midpoint', 'Mid'],
    ['center', 'Center'],
    ['intersection', 'Int'],
  ];

  return (
    <div className="h-11 flex items-center gap-1 px-2 bg-editor-toolbar border-b border-border shrink-0">
      {TOOLS.map((t) => (
        <Tooltip key={t.id}>
          <TooltipTrigger asChild>
            <button
              onClick={() => dispatch(setActiveTool(t.id))}
              className={cn(
                'w-9 h-9 rounded flex items-center justify-center',
                active === t.id
                  ? 'bg-editor-active text-accent'
                  : 'text-muted-foreground hover:bg-editor-hover hover:text-foreground'
              )}
            >
              {t.icon}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {t.label} ({t.shortcut})
          </TooltipContent>
        </Tooltip>
      ))}

      <div className="ml-2 pl-2 border-l flex items-center gap-1">
        <button
          onClick={() => dispatch(toggleSnap())}
          className={cn(
            'h-8 px-2 rounded flex items-center gap-1 text-xs',
            snap ? 'bg-editor-active text-accent' : 'text-muted-foreground'
          )}
        >
          <Magnet className="w-3.5 h-3.5" />
          Snap
        </button>

        {snapButtons.map(([id, label]) => (
          <button
            key={id}
            disabled={!snap}
            onClick={() => dispatch(toggleSnapType(id))}
            className={cn(
              'h-8 px-1.5 rounded text-[10px]',
              snap && types[id] ? 'bg-editor-active text-accent' : 'text-muted-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
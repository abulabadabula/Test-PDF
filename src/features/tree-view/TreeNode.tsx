import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { selectShape, deleteShape, copySelected, pasteClipboard } from '@/app/store/slices/drawingSlice';
import { ChevronRight, ChevronDown, Folder, Square, Columns3, Minus, BrickWall, Layers3 } from 'lucide-react';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';
import type { TreeNodeData } from './types';
import { StructuralPropertyDialog } from '@/features/drawing/StructuralPropertyDialog';
import { AssignLoadsDialog } from '@/components/editor/AssignLoadsDialog';
import type { StructuralElement } from '@/features/drawing/elements/elementTypes';

const icons: any = { column: Columns3, beam: Minus, wall: BrickWall, slab: Layers3, portalFrame: Square };

export function TreeNode({ node, depth, focusedId, onExpandToggle }: { node: TreeNodeData; depth: number; focusedId: string | null; onExpandToggle: (id: string) => void }) {
  const dispatch = useAppDispatch();
  const selectedShapeIds = useAppSelector((s) => s.drawing.selectedShapeIds);
  const [selected, setSelected] = useState<StructuralElement | null>(null);
  const [assigningLoads, setAssigningLoads] = useState<StructuralElement | null>(null);

  const isGroup = node.type === 'group';
  const isSelected = !isGroup && selectedShapeIds.includes(node.id);
  const Icon = isGroup ? Folder : (icons[node.shapeType || ''] || Square);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGroup) {
      onExpandToggle(node.id);
    } else {
      dispatch(selectShape({ id: node.id, multiSelect: e.ctrlKey || e.metaKey || e.shiftKey }));
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isGroup && node.shapeData && 'geometry' in node.shapeData) {
      setSelected(node.shapeData as StructuralElement);
    }
  };

  const handleCopy = () => {
    if (node.shapeData) {
      dispatch(selectShape({ id: node.id }));
      dispatch(copySelected());
      dispatch(pasteClipboard());
    }
  };

  const nodeContent = (
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={`flex items-center gap-1.5 px-2 py-1 text-xs cursor-pointer rounded ${isSelected ? 'bg-accent text-accent-foreground' : focusedId === node.id ? 'bg-muted' : ''}`}
      style={{ paddingLeft: depth * 16 + 8 }}
    >
      {isGroup ? (node.isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />) : <span className="w-3" />}
      <Icon className="w-3.5 h-3.5" />
      <span className="font-mono text-[10px] text-muted-foreground">{node.code}</span>
      <span className="truncate flex-1">{isGroup ? node.label : node.label}</span>
      {node.info && <span className="text-[10px] text-muted-foreground">{node.info}</span>}
      {isGroup && <span className="text-[10px] text-muted-foreground">{node.count}</span>}
    </div>
  );

  if (isGroup) {
    return (
      <div>
        {nodeContent}
        {node.isExpanded && node.children?.map((c) => <TreeNode key={c.id} node={c} depth={depth + 1} focusedId={focusedId} onExpandToggle={onExpandToggle} />)}
      </div>
    );
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{nodeContent}</ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={handleDoubleClick}>Edit Properties</ContextMenuItem>
          <ContextMenuItem
            onClick={() => {
              if (node.shapeData && 'geometry' in node.shapeData) {
                dispatch(selectShape({ id: node.id }));
                setAssigningLoads(node.shapeData as StructuralElement);
              }
            }}
          >
            Assign Loads
          </ContextMenuItem>
          <ContextMenuItem onClick={handleCopy}>Copy</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => dispatch(deleteShape(node.id))} className="text-red-600">Delete</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      {selected && <StructuralPropertyDialog element={selected} open onOpenChange={(open) => { if (!open) setSelected(null); }} />}
      {assigningLoads && (
        <AssignLoadsDialog
          element={assigningLoads}
          open
          onOpenChange={(open) => { if (!open) setAssigningLoads(null); }}
        />
      )}
    </>
  );
}
// src/feature/tree-view/TreeNode.tsx

import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { selectShape, deleteShape, updateShape, copySelected, pasteClipboard } from '@/app/store/slices/drawingSlice';
import { deleteMaterial, deleteSection } from '@/app/store/slices/propertiesSlice'; // 新增引入
import { ChevronRight, ChevronDown, Folder, Square, Columns3, Minus, BrickWall, Layers3 } from 'lucide-react';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger } from '@/components/ui/context-menu';
import type { TreeNodeData } from './types';
import { StructuralPropertyDialog } from '@/features/drawing/StructuralPropertyDialog';
import type { StructuralElement } from '@/features/drawing/elements/elementTypes';
import { PropertyEditorDialog } from './PropertyEditorDialog'; // 新增引入

const icons: any = { column: Columns3, beam: Minus, wall: BrickWall, slab: Layers3, portalFrame: Square };

export function TreeNode({ node, depth, focusedId, onExpandToggle }: { node: TreeNodeData; depth: number; focusedId: string | null; onExpandToggle: (id: string) => void }) {
  const dispatch = useAppDispatch();
  const layers = useAppSelector(s => s.layer.layers);
  
  const [selectedShape, setSelectedShape] = useState<StructuralElement | null>(null);
  // 新增：用于控制 Material/Section 属性对话框的状态
  const [editingPropertyNode, setEditingPropertyNode] = useState<TreeNodeData | null>(null);

  const isGroup = node.type === 'group';
  const Icon = isGroup ? Folder : (icons[node.shapeType || ''] || Square);

  const click = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGroup) {
      onExpandToggle(node.id);
    } else {
      dispatch(selectShape({ id: node.id, multiSelect: e.ctrlKey || e.metaKey || e.shiftKey }));
    }
  };

  // 修改 dbl 函数，支持 material 和 section 类型
  const dbl = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type === 'material' || node.type === 'section') {
      setEditingPropertyNode(node);
    } else if (!isGroup && node.shapeData && 'geometry' in node.shapeData) {
      setSelectedShape(node.shapeData as StructuralElement);
    }
  };

  const copy = () => {
    if (node.shapeData) {
      dispatch(selectShape({ id: node.id }));
      dispatch(copySelected());
      dispatch(pasteClipboard());
    }
  };

  const move = (layerId: string) => dispatch(updateShape({ id: node.id, changes: { layerId } }));

  const handleDeleteProperty = () => {
    if (node.type === 'material' && node.materialData) {
      dispatch(deleteMaterial(node.materialData.id));
    } else if (node.type === 'section' && node.sectionData) {
      dispatch(deleteSection(node.sectionData.id));
    }
  };

  const content = (
    <div
      onClick={click}
      onDoubleClick={dbl}
      className={`flex items-center gap-1.5 px-2 py-1 text-xs cursor-pointer rounded ${focusedId === node.id ? 'bg-muted' : ''}`}
      style={{ paddingLeft: depth * 16 + 8 }}
    >
      {isGroup ? (
        node.isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
      ) : (
        <span className="w-3" />
      )}
      <Icon className="w-3.5 h-3.5" />
      <span className="font-mono text-[10px] text-muted-foreground">{node.code}</span>
      <span className="truncate flex-1">{node.label}</span>
      {node.info && <span className="text-[10px] text-muted-foreground ml-2">{node.info}</span>}
      {isGroup && <span className="text-[10px] text-muted-foreground ml-auto">{node.count}</span>}
    </div>
  );

  if (isGroup) {
    return (
      <div>
        {content}
        {node.isExpanded && node.children?.map(c => (
          <TreeNode key={c.id} node={c} depth={depth + 1} focusedId={focusedId} onExpandToggle={onExpandToggle} />
        ))}
      </div>
    );
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{content}</ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={dbl}>Edit Properties</ContextMenuItem>
          
          {node.type === 'shape' && (
            <>
              <ContextMenuItem onClick={copy}>Copy</ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuSub>
                <ContextMenuSubTrigger>Move to Layer</ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  {layers.map(l => (
                    <ContextMenuItem key={l.id} disabled={l.id === node.shapeData?.layerId} onClick={() => move(l.id)}>
                      {l.name}
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuSub>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => dispatch(deleteShape(node.id))} className="text-red-600">Delete</ContextMenuItem>
            </>
          )}

          {(node.type === 'material' || node.type === 'section') && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={handleDeleteProperty} className="text-red-600">Delete</ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
      
      {/* Shape 属性对话框 */}
      {selectedShape && (
        <StructuralPropertyDialog
          element={selectedShape}
          open
          onOpenChange={open => { if (!open) setSelectedShape(null); }}
        />
      )}

      {/* Material / Section 属性对话框 */}
      {editingPropertyNode && (editingPropertyNode.materialData || editingPropertyNode.sectionData) && (
        <PropertyEditorDialog
          nodeType={editingPropertyNode.type as 'material' | 'section'}
          data={editingPropertyNode.materialData || editingPropertyNode.sectionData || null}
          open={!!editingPropertyNode}
          onOpenChange={(open) => { if (!open) setEditingPropertyNode(null); }}
        />
      )}
    </>
  );
}
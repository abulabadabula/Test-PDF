import {useState} from 'react';
import {useAppDispatch,useAppSelector} from '@/app/store/hooks';
import {selectShape,deleteShape,updateShape,copySelected,pasteClipboard} from '@/app/store/slices/drawingSlice';
import {ChevronRight,ChevronDown,Folder,Square,Columns3,Minus,BrickWall,Layers3} from 'lucide-react';
import {ContextMenu,ContextMenuContent,ContextMenuItem,ContextMenuSeparator,ContextMenuSub,ContextMenuSubContent,ContextMenuSubTrigger,ContextMenuTrigger} from '@/components/ui/context-menu';
import type {TreeNodeData} from './types';
import {StructuralPropertyDialog} from '@/features/drawing/StructuralPropertyDialog';
import type {StructuralElement} from '@/features/drawing/elements/elementTypes';

const icons:any={column:Columns3,beam:Minus,wall:BrickWall,slab:Layers3,portalFrame:Square};
export function TreeNode({node,depth,focusedId,onExpandToggle}:{node:TreeNodeData;depth:number;focusedId:string|null;onExpandToggle:(id:string)=>void}){
 const dispatch=useAppDispatch();const layers=useAppSelector(s=>s.layer.layers);const[selected,setSelected]=useState<StructuralElement|null>(null);
 const isGroup=node.type==='group';const Icon=isGroup?Folder:(icons[node.shapeType||'']||Square);
 const click=(e:React.MouseEvent)=>{e.stopPropagation();if(isGroup)onExpandToggle(node.id);else dispatch(selectShape({id:node.id,multiSelect:e.ctrlKey||e.metaKey||e.shiftKey}));};
 const dbl=(e:React.MouseEvent)=>{e.stopPropagation();if(!isGroup&&node.shapeData&&'geometry'in node.shapeData)setSelected(node.shapeData as StructuralElement);};
 const copy=()=>{if(node.shapeData){dispatch(selectShape({id:node.id}));dispatch(copySelected());dispatch(pasteClipboard());}};
 const move=(layerId:string)=>dispatch(updateShape({id:node.id,changes:{layerId}}));
 const content=<div onClick={click} onDoubleClick={dbl} className={`flex items-center gap-1.5 px-2 py-1 text-xs cursor-pointer rounded ${focusedId===node.id?'bg-muted':''}`} style={{paddingLeft:depth*16+8}}>{isGroup?(node.isExpanded?<ChevronDown className="w-3 h-3"/>:<ChevronRight className="w-3 h-3"/>):<span className="w-3"/>}<Icon className="w-3.5 h-3.5"/><span className="font-mono text-[10px] text-muted-foreground">{node.code}</span><span className="truncate flex-1">{isGroup?node.label:node.label}</span>{node.info&&<span className="text-[10px] text-muted-foreground">{node.info}</span>}{isGroup&&<span className="text-[10px] text-muted-foreground">{node.count}</span>}</div>;
 if(isGroup)return <div>{content}{node.isExpanded&&node.children?.map(c=><TreeNode key={c.id} node={c} depth={depth+1} focusedId={focusedId} onExpandToggle={onExpandToggle}/>)}</div>;
 return <><ContextMenu><ContextMenuTrigger asChild>{content}</ContextMenuTrigger><ContextMenuContent className="w-48"><ContextMenuItem onClick={dbl}>Edit Properties</ContextMenuItem><ContextMenuItem onClick={copy}>Copy</ContextMenuItem><ContextMenuSeparator/><ContextMenuSub><ContextMenuSubTrigger>Move to Layer</ContextMenuSubTrigger><ContextMenuSubContent>{layers.map(l=><ContextMenuItem key={l.id} disabled={l.id===node.shapeData?.layerId} onClick={()=>move(l.id)}>{l.name}</ContextMenuItem>)}</ContextMenuSubContent></ContextMenuSub><ContextMenuSeparator/><ContextMenuItem onClick={()=>dispatch(deleteShape(node.id))} className="text-red-600">Delete</ContextMenuItem></ContextMenuContent></ContextMenu>{selected&&<StructuralPropertyDialog element={selected} open onOpenChange={open=>{if(!open)setSelected(null)}}/>}</>;
}

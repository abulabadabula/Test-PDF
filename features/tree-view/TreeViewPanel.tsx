import {useState,useEffect,useCallback,useRef} from 'react';
import {useAppDispatch} from '@/app/store/hooks';
import {selectShape,clearSelection} from '@/app/store/slices/drawingSlice';
import {useTreeData} from './useTreeData';
import {TreeToolbar} from './TreeToolbar';
import {TreeNode} from './TreeNode';
import type {SortBy,TreeNodeData} from './types';

export function TreeViewPanel(){
 const dispatch=useAppDispatch();const[searchQuery,setSearchQuery]=useState('');const[sortBy,setSortBy]=useState<SortBy>('createdAt');const[expandedIds,setExpandedIds]=useState<Set<string>>(new Set());const[focusedIndex,setFocusedIndex]=useState(-1);const treeData=useTreeData(searchQuery,sortBy);const ref=useRef<HTMLDivElement>(null);
 const flat=useCallback((nodes:TreeNodeData[],depth=0):{node:TreeNodeData;depth:number}[]=>{let r:any[]=[];nodes.forEach(n=>{r.push({node:n,depth});if(n.isExpanded||expandedIds.has(n.id))r=r.concat(flat(n.children||[],depth+1));});return r;},[expandedIds]);const nodes=flat(treeData);
 useEffect(()=>setExpandedIds(new Set(treeData.map(n=>n.id))),[treeData.length]);
 useEffect(()=>{const h=(e:KeyboardEvent)=>{if((e.target as HTMLElement).tagName==='INPUT')return;if(e.key==='ArrowDown')setFocusedIndex(i=>Math.min(i+1,nodes.length-1));else if(e.key==='ArrowUp')setFocusedIndex(i=>Math.max(i-1,0));else if(e.key==='Enter'&&focusedIndex>=0){const n=nodes[focusedIndex]?.node;if(n?.type==='shape')dispatch(selectShape({id:n.id}));else if(n)setExpandedIds(s=>{const x=new Set(s);x.has(n.id)?x.delete(n.id):x.add(n.id);return x;});}else if(e.key==='Escape'){dispatch(clearSelection());setFocusedIndex(-1);}};const el=ref.current;el?.addEventListener('keydown',h);return()=>el?.removeEventListener('keydown',h);},[nodes,focusedIndex,dispatch]);
 const toggle=(id:string)=>setExpandedIds(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n;});
 const focusedId=focusedIndex>=0?nodes[focusedIndex]?.node.id:null;
 return <div ref={ref} tabIndex={0} className="flex flex-col h-full bg-white focus:outline-none"><div className="p-3 border-b flex items-center justify-between"><h3 className="font-semibold text-sm">Structural Elements</h3><span className="text-xs text-muted-foreground">{nodes.filter(n=>n.node.type==='shape').length}</span></div><TreeToolbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} sortBy={sortBy} setSortBy={setSortBy}/><div className="flex-1 overflow-y-auto p-1">{treeData.length?treeData.map(n=><TreeNode key={n.id} node={{...n,isExpanded:expandedIds.has(n.id)}} depth={0} focusedId={focusedId} onExpandToggle={toggle}/>):<div className="p-6 text-center text-xs text-muted-foreground">No structural elements on this page.</div>}</div></div>;
}

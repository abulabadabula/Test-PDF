import {useMemo} from 'react';
import {useSelector} from 'react-redux';
import {createSelector} from '@reduxjs/toolkit';
import type {RootState} from '@/app/store';
import type {Shape} from '@/app/store/slices/drawingSlice';
import type {TreeNodeData,SortBy} from './types';
import {structuralTypeLabel} from '@/features/drawing/elements/elementDefaults';

const groups=['node','column','beam','wall','slab','portalFrame'] as const;
const info = (s: Shape) => {
  if ('geometry' in s) {
    const g: any = s.geometry;
    if (s.type === 'node') return `${Math.round(g.x)}, ${Math.round(g.y)}`;
    if (s.type === 'column') return `${g.width}×${g.depth}`;
    if (s.type === 'beam') return `${g.width}×${g.depth}`;
    if (s.type === 'wall') return `${g.thickness} thick`;
    if (s.type === 'slab') return `${(s as any).properties.thickness} thick`;
    return `${Math.round(Math.hypot(g.end.x - g.start.x, g.end.y - g.start.y))} × ${g.height}`;
  }
  return s.type;
};
const selectShapes=(s:RootState)=>s.drawing.shapes;const selectPage=(s:RootState)=>s.pdf.currentPage;
const make=()=>createSelector([selectShapes,selectPage,(_:RootState,p:{q:string;sort:SortBy})=>p],(shapes,page,{q,sort})=>{
 const pageShapes=shapes.filter(s=>s.pageIndex===page);
 return groups.map(type=>{let list=pageShapes.filter(s=>s.type===type);if(q){const query=q.toLowerCase();list=list.filter(s=>(s.label||'').toLowerCase().includes(query)||info(s).toLowerCase().includes(query)||s.type.toLowerCase().includes(query));}
  list=[...list].sort((a,b)=>sort==='name'?(a.label||'').localeCompare(b.label||''):sort==='type'?a.type.localeCompare(b.type):new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime());
  return {id:`group:${type}`,type:'group',label:structuralTypeLabel(type),count:list.length,isExpanded:true,children:list.map(s=>({id:s.id,type:'shape',label:s.label||s.type,code:s.label,shapeType:s.type,info:info(s),shapeData:s}))};
 }).filter(g=>g.count||!q) as TreeNodeData[];
});
export function useTreeData(searchQuery:string,sortBy:SortBy){const selector=useMemo(make,[]);return useSelector((s:RootState)=>selector(s,{q:searchQuery,sort:sortBy}));}

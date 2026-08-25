// import {useMemo} from 'react';
// import {useSelector} from 'react-redux';
// import {createSelector} from '@reduxjs/toolkit';
// import type {RootState} from '@/app/store';
// import type {Shape} from '@/app/store/slices/drawingSlice';
// import type {TreeNodeData,SortBy} from './types';
// import {structuralTypeLabel} from '@/features/drawing/elements/elementDefaults';

// const groups=['node','column','beam','wall','slab','portalFrame'] as const;

// const info = (s: Shape) => {
//   if ('geometry' in s) {
//     const g: any = s.geometry;
//     if (s.type === 'node') return `${Math.round(g.x)}, ${Math.round(g.y)}`;
//     if (s.type === 'column') return `${g.width}×${g.depth}`;
//     if (s.type === 'beam') return `${g.width}×${g.depth}`;
//     if (s.type === 'wall') return `${g.thickness} thick`;
//     if (s.type === 'slab') return `${(s as any).properties.thickness} thick`;
//     return `${Math.round(Math.hypot(g.end.x - g.start.x, g.end.y - g.start.y))} × ${g.height}`;
//   }
//   return s.type;
// };

// const selectShapes=(s:RootState)=>s.drawing.shapes;const selectPage=(s:RootState)=>s.pdf.currentPage;
// const make=()=>createSelector([selectShapes,selectPage,(_:RootState,p:{q:string;sort:SortBy})=>p],(shapes,page,{q,sort})=>{
//  const pageShapes=shapes.filter(s=>s.pageIndex===page);
//  return groups.map(type=>{let list=pageShapes.filter(s=>s.type===type);if(q){const query=q.toLowerCase();list=list.filter(s=>(s.label||'').toLowerCase().includes(query)||info(s).toLowerCase().includes(query)||s.type.toLowerCase().includes(query));}
//   list=[...list].sort((a,b)=>sort==='name'?(a.label||'').localeCompare(b.label||''):sort==='type'?a.type.localeCompare(b.type):new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime());
//   return {id:`group:${type}`,type:'group',label:structuralTypeLabel(type),count:list.length,isExpanded:true,children:list.map(s=>({id:s.id,type:'shape',label:s.label||s.type,code:s.label,shapeType:s.type,info:info(s),shapeData:s}))};
//  }).filter(g=>g.count||!q) as TreeNodeData[];
// });
// export function useTreeData(searchQuery:string,sortBy:SortBy){const selector=useMemo(make,[]);return useSelector((s:RootState)=>selector(s,{q:searchQuery,sort:sortBy}));}


import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/app/store';
import type { Shape } from '@/app/store/slices/drawingSlice';
import type { TreeNodeData, SortBy } from './types';
import { structuralTypeLabel } from '@/features/drawing/elements/elementDefaults';

const groups = ['node', 'column', 'beam', 'wall', 'slab', 'portalFrame'] as const;

const info = (s: Shape) => {
  if ('geometry' in s) {
    const g: any = s.geometry;
    if (s.type === 'node') return `${Math.round(g.x)}, ${Math.round(g.y)}`;
    if (s.type === 'column' || s.type === 'beam') return `${g.width}×${g.depth}`;
    if (s.type === 'wall') return `${g.thickness} thick`;
    if (s.type === 'slab') return `${(s as any).properties.thickness} thick`;
    return `${Math.round(Math.hypot(g.end.x - g.start.x, g.end.y - g.start.y))} × ${g.height}`;
  }
  return s.type;
};

const make = () => createSelector(
  [
    (s: RootState) => s.drawing.shapes,
    (s: RootState) => s.pdf.currentPage,
    (s: RootState) => s.properties.materials,
    (s: RootState) => s.properties.sections,
    (_: RootState, p: { q: string; sort: SortBy }) => p
  ],
  (shapes, page, materials, sections, { q, sort }) => {
    const pageShapes = shapes.filter(s => s.pageIndex === page);
    
    // 1. 结构构件分组 (原有逻辑)
    const shapeGroups = groups.map(type => {
      let list = pageShapes.filter(s => s.type === type);
      if (q) {
        const query = q.toLowerCase();
        list = list.filter(s => (s.label || '').toLowerCase().includes(query) || info(s).toLowerCase().includes(query) || s.type.toLowerCase().includes(query));
      }
      list = [...list].sort((a, b) => {
        if (sort === 'name') return (a.label || '').localeCompare(b.label || '');
        if (sort === 'type') return a.type.localeCompare(b.type);
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
      return {
        id: `group:${type}`,
        type: 'group' as const,
        label: structuralTypeLabel(type),
        count: list.length,
        isExpanded: true,
        children: list.map(s => ({
          id: s.id,
          type: 'shape' as const,
          label: s.label || s.type,
          code: s.label,
          shapeType: s.type,
          info: info(s),
          shapeData: s
        }))
      };
    }).filter(g => g.count || !q);

    // 2. Properties 分组 (Materials & Sections)
    let filteredMaterials = [...materials];
    let filteredSections = [...sections];
    
    if (q) {
      const query = q.toLowerCase();
      filteredMaterials = filteredMaterials.filter(m => m.name.toLowerCase().includes(query) || m.type.toLowerCase().includes(query));
      filteredSections = filteredSections.filter(s => s.name.toLowerCase().includes(query) || s.type.toLowerCase().includes(query));
    }

    const sortFn = (a: any, b: any) => {
      if (sort === 'name') return (a.name).localeCompare(b.name);
      if (sort === 'type') return (a.type).localeCompare(b.type);
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    };
    filteredMaterials.sort(sortFn);
    filteredSections.sort(sortFn);

    const materialGroup = {
      id: 'group:materials',
      type: 'group' as const,
      label: 'Materials',
      count: filteredMaterials.length,
      isExpanded: true,
      children: filteredMaterials.map(m => ({
        id: m.id,
        type: 'material' as const,
        label: m.name,
        code: m.type,
        info: `E: ${m.youngsModulus}, ν: ${m.poissonRatio}`,
        materialData: m
      }))
    };

    const sectionGroup = {
      id: 'group:sections',
      type: 'group' as const,
      label: 'Sections',
      count: filteredSections.length,
      isExpanded: true,
      children: filteredSections.map(s => {
        const mat = materials.find(m => m.id === s.materialId);
        return {
          id: s.id,
          type: 'section' as const,
          label: s.name,
          code: s.type,
          info: `Mat: ${mat?.name || 'Unknown'}, A: ${s.area}`,
          sectionData: s
        };
      })
    };

    // 将 Properties 大类放在树形结构的最顶部
    return [materialGroup, sectionGroup, ...shapeGroups] as TreeNodeData[];
  }
);

export function useTreeData(searchQuery: string, sortBy: SortBy) {
  const selector = useMemo(make, []);
  return useSelector((s: RootState) => selector(s, { q: searchQuery, sort: sortBy }));
}
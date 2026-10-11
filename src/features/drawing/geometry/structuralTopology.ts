import type { Shape } from '@/app/store/slices/drawingSlice';
import type { StructuralElement, NodeElement } from '../elements/elementTypes';

export const NODE_CONNECTION_TOLERANCE = 12;

const isStructural = (s: Shape): s is StructuralElement =>
  'geometry' in s && 'properties' in s && 'style' in s;

const isNode = (s: Shape): s is NodeElement =>
  isStructural(s) && s.type === 'node';

const dist = (a:{x:number;y:number}, b:{x:number;y:number}) =>
  Math.hypot(a.x-b.x, a.y-b.y);

const nodePoint = (n: NodeElement) => ({x:n.geometry.x,y:n.geometry.y});

function nearestNode(nodes: NodeElement[], point:{x:number;y:number}, tolerance=NODE_CONNECTION_TOLERANCE) {
  let best: NodeElement | undefined;
  let bestDistance=Infinity;
  for (const node of nodes) {
    const d=dist(nodePoint(node),point);
    if (d<=tolerance && d<bestDistance) { best=node; bestDistance=d; }
  }
  return best;
}

/**
 * Nodes only ever connect to members drawn on the same page and Plan Sheet.
 * Floors are cropped from different PDF pages (or different regions), so
 * identical page coordinates on two floors must not be treated as one node.
 */
const spaceKey=(s: StructuralElement)=>`${s.pageIndex}|${s.sheetId ?? ''}`;

/** Recover missing node references from geometry. Safe to call repeatedly. */
export function reconcileStructuralTopology(shapes: Shape[]) {
  const nodesBySpace=new Map<string,NodeElement[]>();
  for (const shape of shapes) {
    if (!isNode(shape)) continue;
    const key=spaceKey(shape);
    const list=nodesBySpace.get(key);
    if (list) list.push(shape); else nodesBySpace.set(key,[shape]);
  }

  for (const shape of shapes) {
    if (!isStructural(shape) || shape.type==='node') continue;
    const nodes=nodesBySpace.get(spaceKey(shape)) ?? [];
    const p=shape.properties as any;

    if (shape.type==='column') {
      const n=nearestNode(nodes,{
        x:shape.geometry.x+shape.geometry.width/2,
        y:shape.geometry.y+shape.geometry.depth/2
      });
      if (n) p.nodeId=n.id;
    } else if (shape.type==='beam' || shape.type==='wall' || shape.type==='portalFrame') {
      const a=nearestNode(nodes,shape.geometry.start);
      const b=nearestNode(nodes,shape.geometry.end);
      if (a) p.startNodeId=a.id;
      if (b) p.endNodeId=b.id;
    } else if (shape.type==='slab') {
      p.nodeIds=shape.geometry.points.map((pt:any,i:number)=>{
        const existing=Array.isArray(p.nodeIds) ? p.nodeIds[i] : undefined;
        const byId=typeof existing==='string' ? nodes.find(n=>n.id===existing) : undefined;
        return (byId && dist(nodePoint(byId),pt)<=NODE_CONNECTION_TOLERANCE*3
          ? byId
          : nearestNode(nodes,pt))?.id ?? '';
      });
    }
  }
}

function targetNodes(previous: StructuralElement, next: StructuralElement) {
  const result=new Map<string,{x:number;y:number}>();
  const pp=previous.properties as any;
  const np=next.properties as any;

  if (next.type==='node') {
    result.set(next.id,{x:next.geometry.x,y:next.geometry.y});
  } else if (next.type==='column') {
    const id=np.nodeId ?? pp.nodeId;
    if(id) result.set(id,{
      x:next.geometry.x+next.geometry.width/2,
      y:next.geometry.y+next.geometry.depth/2
    });
  } else if (next.type==='beam' || next.type==='wall' || next.type==='portalFrame') {
    const a=np.startNodeId ?? pp.startNodeId;
    const b=np.endNodeId ?? pp.endNodeId;
    if(a) result.set(a,{...next.geometry.start});
    if(b) result.set(b,{...next.geometry.end});
  } else if (next.type==='slab') {
    const ids=Array.isArray(np.nodeIds) ? np.nodeIds : pp.nodeIds;
    next.geometry.points.forEach((pt:any,i:number)=>{
      const id=ids?.[i];
      if(typeof id==='string' && id) result.set(id,{...pt});
    });
  }
  return result;
}

function applyTargets(shape: StructuralElement, targets: Map<string,{x:number;y:number}>) {
  const p=shape.properties as any;
  if(shape.type==='node') {
    const t=targets.get(shape.id);
    if(t){shape.geometry.x=t.x;shape.geometry.y=t.y;}
  } else if(shape.type==='column') {
    const t=p.nodeId ? targets.get(p.nodeId) : undefined;
    if(t){
      shape.geometry.x=t.x-shape.geometry.width/2;
      shape.geometry.y=t.y-shape.geometry.depth/2;
    }
  } else if(shape.type==='beam' || shape.type==='wall' || shape.type==='portalFrame') {
    const a=p.startNodeId ? targets.get(p.startNodeId) : undefined;
    const b=p.endNodeId ? targets.get(p.endNodeId) : undefined;
    if(a) shape.geometry.start={...a};
    if(b) shape.geometry.end={...b};
  } else if(shape.type==='slab') {
    const ids=Array.isArray(p.nodeIds) ? p.nodeIds : [];
    shape.geometry.points=shape.geometry.points.map((pt:any,i:number)=>{
      const t=typeof ids[i]==='string' ? targets.get(ids[i]) : undefined;
      return t ? {...t} : pt;
    });
  }
}

export function updateStructuralShape(shapes: Shape[], id:string, changes:Partial<Shape>) {
  reconcileStructuralTopology(shapes);
  const shape=shapes.find(s=>s.id===id);
  if(!shape) return;

  if(!isStructural(shape)){
    Object.assign(shape as any,changes,{updatedAt:new Date().toISOString()});
    return;
  }

  const previous=JSON.parse(JSON.stringify(shape)) as StructuralElement;
  const {properties,...rest}=changes as any;
  Object.assign(shape as any,rest);
  if(properties && typeof properties==='object'){
    shape.properties={...(shape.properties as any),...properties} as any;
  }

  const targets=targetNodes(previous,shape);
  for(const item of shapes){
    if(isStructural(item)) applyTargets(item,targets);
  }

  const now=new Date().toISOString();
  for(const item of shapes){
    if(isStructural(item) && (item.id===id || item.type==='node' && targets.has(item.id))){
      item.updatedAt=now;
    }
  }
}

export function clearStructuralReferencesToNode(shapes:Shape[],nodeId:string){
  for(const shape of shapes){
    if(!isStructural(shape) || shape.type==='node') continue;
    const p=shape.properties as any;
    if(shape.type==='column' && p.nodeId===nodeId) delete p.nodeId;
    if(shape.type==='beam'||shape.type==='wall'||shape.type==='portalFrame'){
      if(p.startNodeId===nodeId) delete p.startNodeId;
      if(p.endNodeId===nodeId) delete p.endNodeId;
    }
    if(shape.type==='slab' && Array.isArray(p.nodeIds)){
      p.nodeIds=p.nodeIds.map((id:string)=>id===nodeId ? '' : id);
    }
  }
}

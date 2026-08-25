import type { StructuralElement } from '../elements/elementTypes';
import type { SnapPoint, SnapSettings, SnapType } from './snamTypes';
import { distance, elementBounds, distanceToSegment } from '../geometry/geometryUtils';


function lineSegments(e:StructuralElement):Array<[{x:number;y:number},{x:number;y:number}]>{
 switch(e.type){
  case 'node': return [];
  case 'beam': return [[e.geometry.start,e.geometry.end]];
  case 'wall': return [[e.geometry.start,e.geometry.end]];
  case 'portalFrame': {const g=e.geometry;return [[g.start,{x:g.start.x,y:g.start.y+g.height}],[g.end,{x:g.end.x,y:g.end.y+g.height}],[{x:g.start.x,y:g.start.y+g.height},{x:g.end.x,y:g.end.y+g.height}]];}
  case 'slab': return e.geometry.points.map((p,i)=>[p,e.geometry.points[(i+1)%e.geometry.points.length]] as any);
  default:return [];
 }
}
function segmentIntersection(a:{x:number;y:number},b:{x:number;y:number},c:{x:number;y:number},d:{x:number;y:number}){
 const den=(a.x-b.x)*(c.y-d.y)-(a.y-b.y)*(c.x-d.x);if(Math.abs(den)<1e-9)return null;
 const px=((a.x*b.y-a.y*b.x)*(c.x-d.x)-(a.x-b.x)*(c.x*d.y-c.y*d.x))/den;
 const py=((a.x*b.y-a.y*b.x)*(c.y-d.y)-(a.y-b.y)*(c.x*d.y-c.y*d.x))/den;
 const on=(p:number,q:number,r:number)=>p>=Math.min(q,r)-1e-6&&p<=Math.max(q,r)+1e-6;
 return on(px,a.x,b.x)&&on(py,a.y,b.y)&&on(px,c.x,d.x)&&on(py,c.y,d.y)?{x:px,y:py}:null;
}

const defaultSettings: SnapSettings = {
  enabled:true,
  types:{grid:true,endpoint:true,midpoint:true,center:true,intersection:true,nearest:true},
  gridSize:100,
  tolerancePx:10,
};

const endpoints = (e:StructuralElement) => {
  switch(e.type) {
    case 'node': return [{ x: e.geometry.x, y: e.geometry.y }];
    case 'column': return [{ x: e.geometry.x + e.geometry.width / 2, 
        y: e.geometry.y + e.geometry.depth / 2 
      }];
    case 'beam':
    case 'wall':
      return [e.geometry.start,e.geometry.end];
    case 'slab':
      return e.geometry.points;
    case 'portalFrame':
      return [e.geometry.start,e.geometry.end,{x:e.geometry.start.x,y:e.geometry.start.y+e.geometry.height},{x:e.geometry.end.x,y:e.geometry.end.y+e.geometry.height}];
    default:
      return [];
  }
};

export function findSnapPoint(cursor:{x:number;y:number}, elements:StructuralElement[], zoom:number, settings:Partial<SnapSettings>={}):SnapPoint|null {
  const s={...defaultSettings,...settings,types:{...defaultSettings.types,...settings.types}};
  if(!s.enabled) return null;
  const tolerance=s.tolerancePx/Math.max(zoom,0.0001);
  const candidates:SnapPoint[]=[];
  if(s.types.grid && s.gridSize>0) {
    const p={x:Math.round(cursor.x/s.gridSize)*s.gridSize,y:Math.round(cursor.y/s.gridSize)*s.gridSize};
    candidates.push({point:p,type:'grid',distance:distance(cursor,p)});
  }
  for(const e of elements) {
    if(s.types.endpoint) for(const p of endpoints(e)) candidates.push({point:p,type:'endpoint',elementId:e.id,distance:distance(cursor,p)});
    if(s.types.center) {
      const b=elementBounds(e); const p={x:(b.minX+b.maxX)/2,y:(b.minY+b.maxY)/2};
      candidates.push({point:p,type:'center',elementId:e.id,distance:distance(cursor,p)});
    }
    if(s.types.midpoint) {
      const pts=endpoints(e);
      for(let i=0;i<pts.length-1;i++) candidates.push({point:{x:(pts[i].x+pts[i+1].x)/2,y:(pts[i].y+pts[i+1].y)/2},type:'midpoint',elementId:e.id,distance:distance(cursor,{x:(pts[i].x+pts[i+1].x)/2,y:(pts[i].y+pts[i+1].y)/2})});
    }
  }
  if(s.types.intersection){
    for(let i=0;i<elements.length;i++)for(let j=i+1;j<elements.length;j++){
      for(const ab of lineSegments(elements[i]))for(const cd of lineSegments(elements[j])){
        const p=segmentIntersection(ab[0],ab[1],cd[0],cd[1]);if(p)candidates.push({point:p,type:'intersection',distance:distance(cursor,p)});
      }
    }
  }
  const valid=candidates.filter(c=>c.distance<=tolerance);
  if(!valid.length) return null;
  return valid.sort((a,b)=>a.distance-b.distance)[0];
}

export function snapPoint(cursor:{x:number;y:number}, elements:StructuralElement[], zoom:number, settings?:Partial<SnapSettings>) {
  return findSnapPoint(cursor,elements,zoom,settings)?.point ?? cursor;
}

export function snapTypeLabel(type:SnapType) {
  return {grid:'Grid',endpoint:'Endpoint',midpoint:'Midpoint',center:'Center',intersection:'Intersection',nearest:'Nearest'}[type];
}

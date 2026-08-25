import type { StructuralElement } from '../elements/elementTypes';
import { distanceToSegment, pointInPolygon, rotatePoint } from './geometryUtils';

export function hitTestStructuralElement(element: StructuralElement, p:{x:number;y:number}, tolerance:number): boolean {
  switch(element.type) {
    case 'node': {
      const g = element.geometry;
      return Math.hypot(g.x - p.x, g.y - p.y) <= tolerance;
    }
    case 'column': {
      const g=element.geometry, c={x:g.x+g.width/2,y:g.y+g.depth/2};
      const q=rotatePoint(p,c,-g.rotation);
      return q.x>=g.x-tolerance && q.x<=g.x+g.width+tolerance && q.y>=g.y-tolerance && q.y<=g.y+g.depth+tolerance;
    }
    case 'beam': {
      const g=element.geometry;
      return distanceToSegment(p,g.start,g.end)<=g.width/2+tolerance;
    }
    case 'wall': {
      const g=element.geometry;
      return distanceToSegment(p,g.start,g.end)<=g.thickness/2+tolerance;
    }
    case 'slab': {
      return pointInPolygon(p,element.geometry.points) || (() => {
        const pts=element.geometry.points;
        for(let i=0;i<pts.length;i++){ if(distanceToSegment(p,pts[i],pts[(i+1)%pts.length])<=tolerance) return true; }
        return false;
      })();
    }
    case 'portalFrame': {
      const g=element.geometry;
      const left={x:g.start.x,y:g.start.y}, right={x:g.end.x,y:g.end.y};
      const leftTop={x:left.x,y:left.y+g.height}, rightTop={x:right.x,y:right.y+g.height};
      return distanceToSegment(p,left,leftTop)<=g.columnWidth/2+tolerance ||
        distanceToSegment(p,right,rightTop)<=g.columnWidth/2+tolerance ||
        distanceToSegment(p,leftTop,rightTop)<=g.beamDepth/2+tolerance;
    }
    default:
      return false;
  }
}

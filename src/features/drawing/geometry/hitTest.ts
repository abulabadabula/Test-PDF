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
      const pts = element.geometry.points;
      if (pts.length < 3) return false;
      if (!pointInPolygon(p, pts)) return false;

      // 略微缩小 slab 的选择判定范围（向内收缩边距），
      // 避免当 slab 边缘有 beam 或 wall 时，在梁/墙上点击误选 slab 而无法选中梁/墙
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (let i = 0; i < pts.length; i++) {
        const pt = pts[i];
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      }
      const minDim = Math.min(maxX - minX, maxY - minY);
      const edgeInset = Math.min(Math.max(tolerance * 1.2, 4), minDim * 0.35);

      for (let i = 0; i < pts.length; i++) {
        if (distanceToSegment(p, pts[i], pts[(i + 1) % pts.length]) <= edgeInset) {
          return false;
        }
      }
      return true;
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

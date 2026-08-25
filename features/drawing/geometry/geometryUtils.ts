/**
 * Geometry utility functions for 2D structural elements.
 *
 * Provides computational geometry helpers including:
 * - Distance and projection calculations (point-to-point, point-to-segment)
 * - 2D point transformations (rotation, translation)
 * - Bounding box (AABB) computation for points and structural elements
 * - Hit testing / point-in-polygon containment
 */

import type { PagePoint } from '@/core/coordinate/coordinateTypes';
import type { StructuralElement } from '../elements/elementTypes';

/**
 * Represents an axis-aligned 2D bounding box (AABB).
 */
export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Calculates the Euclidean distance between two 2D points.
 *
 * @param a - First point
 * @param b - Second point
 * @returns The distance between point `a` and point `b`
 */
export const distance = (a: PagePoint, b: PagePoint): number =>
  Math.hypot(b.x - a.x, b.y - a.y);

/**
 * Calculates the shortest distance from a point `p` to a line segment defined by endpoints `a` and `b`.
 *
 * Projects point `p` onto the line segment `ab`, clamping the projection factor `t` to [0, 1]
 * to ensure the closest point lies within the segment.
 *
 * @param p - The target point
 * @param a - Start point of the line segment
 * @param b - End point of the line segment
 * @returns Shortest distance from `p` to segment `ab`
 */
export function distanceToSegment(p: PagePoint, a: PagePoint, b: PagePoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  // If the segment has zero length (a and b coincide), return distance to point a
  if (dx === 0 && dy === 0) return distance(p, a);

  // Calculate the projection factor t of point p onto line segment ab
  // t = ((p - a) . (b - a)) / |b - a|^2
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));

  // Closest point on the segment
  return distance(p, { x: a.x + t * dx, y: a.y + t * dy });
}

/**
 * Rotates a 2D point around a specified center point by a given angle in degrees.
 *
 * @param p - The point to rotate
 * @param center - The center point of rotation
 * @param angleDeg - Rotation angle in degrees (clockwise in a standard screen coordinate system where Y points down)
 * @returns The rotated point
 */
export function rotatePoint(p: PagePoint, center: PagePoint, angleDeg: number): PagePoint {
  const a = (angleDeg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const x = p.x - center.x;
  const y = p.y - center.y;

  return {
    x: center.x + x * c - y * s,
    y: center.y + x * s + y * c,
  };
}

/**
 * Calculates the axis-aligned bounding box (AABB) enclosing a set of 2D points.
 *
 * @param points - Array of points to enclose
 * @returns The bounding box spanning all points, or {0, 0, 0, 0} if points array is empty
 */
export function polygonBounds(points: PagePoint[]): Bounds {
  if (!points.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };

  return points.reduce(
    (b, p) => ({
      minX: Math.min(b.minX, p.x),
      minY: Math.min(b.minY, p.y),
      maxX: Math.max(b.maxX, p.x),
      maxY: Math.max(b.maxY, p.y),
    }),
    { minX: points[0].x, minY: points[0].y, maxX: points[0].x, maxY: points[0].y },
  );
}

/**
 * 计算多边形的有向面积（Shoelace Formula）。
 * 在屏幕坐标系（Y轴向下）中：
 * - 面积 > 0 表示顶点为顺时针 (CW) 排列
 * - 面积 < 0 表示顶点为逆时针 (CCW) 排列
 */
function getSignedArea(points: PagePoint[]): number {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return area / 2;
}

/**
 * 计算两条直线的交点。
 * 直线1: p1 + t * v1
 * 直线2: p2 + u * v2
 */
function getLineIntersection(
  p1: PagePoint,
  v1: PagePoint,
  p2: PagePoint,
  v2: PagePoint
): PagePoint | null {
  const denominator = v1.x * v2.y - v1.y * v2.x;
  // 如果分母接近 0，说明两直线平行或共线
  if (Math.abs(denominator) < 1e-9) {
    return null;
  }
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const t = (dx * v2.y - dy * v2.x) / denominator;
  
  return {
    x: p1.x + t * v1.x,
    y: p1.y + t * v1.y,
  };
}

/**
 * 计算多边形向内偏移 (Inset) 一定距离后的新顶点数组。
 * 
 * @param points 原始多边形顶点数组 (必须按顺序排列，首尾可不闭合)
 * @param offset 向内偏移的距离 (像素)。如果为负数，则向外偏移。
 * @returns 偏移后的新多边形顶点数组
 */
export function getInsetPolygon(points: PagePoint[], offset: number): PagePoint[] {
  if (points.length < 3) return [...points];

  const n = points.length;
  // 在屏幕坐标系中，面积 > 0 代表顺时针 (CW)
  const isCW = getSignedArea(points) > 0;
  
  const newPoints: PagePoint[] = [];

  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const curr = points[i];
    const next = points[(i + 1) % n];

    // 当前顶点的前一条边和后一条边的向量
    const v1 = { x: curr.x - prev.x, y: curr.y - prev.y };
    const v2 = { x: next.x - curr.x, y: next.y - curr.y };

    const len1 = Math.hypot(v1.x, v1.y);
    const len2 = Math.hypot(v2.x, v2.y);

    // 忽略退化的零长度边
    if (len1 < 1e-9 || len2 < 1e-9) continue;

    // 单位方向向量
    const d1 = { x: v1.x / len1, y: v1.y / len1 };
    const d2 = { x: v2.x / len2, y: v2.y / len2 };

    // 计算指向多边形内部的单位法向量
    // 屏幕坐标系下：
    // - 若为 CW，沿边前进时内部在左侧 -> 逆时针旋转 90 度: (-dy, dx)
    // - 若为 CCW，沿边前进时内部在右侧 -> 顺时针旋转 90 度: (dy, -dx)
    const n1 = isCW ? { x: -d1.y, y: d1.x } : { x: d1.y, y: -d1.x };
    const n2 = isCW ? { x: -d2.y, y: d2.x } : { x: d2.y, y: -d2.x };

    // 将当前顶点沿两条边的内法向量分别平移 offset 距离，得到偏移后直线上的两个点
    const p1_offset = { x: curr.x + n1.x * offset, y: curr.y + n1.y * offset };
    const p2_offset = { x: curr.x + n2.x * offset, y: curr.y + n2.y * offset };

    // 求这两条偏移后直线的交点，即为新多边形的顶点
    const intersection = getLineIntersection(p1_offset, d1, p2_offset, d2);
    
    if (intersection) {
      newPoints.push(intersection);
    } else {
      // 退化情况：两边几乎平行，直接取其中一条边的偏移点作为新顶点
      newPoints.push(p1_offset);
    }
  }

  // 过滤掉因 offset 过大导致多边形完全坍缩产生的无效点 (简单启发式保护)
  if (newPoints.length < 3) {
    return points; // 偏移过大，退回原多边形
  }

  return newPoints;
}




/**
 * Computes the axis-aligned bounding box (AABB) for any structural element.
 *
 * Handles different geometry shapes and transformations per element type:
 * - `column`: Rectangular box centered at `(x + width/2, y + depth/2)` with rotation applied.
 * - `beam`: Oriented rectangle formed by offsetting normal vectors along the centerline segment with half-width.
 * - `wall`: Oriented rectangle formed by offsetting normal vectors along the centerline segment with half-thickness.
 * - `slab`: Polygon enclosing all vertex points.
 * - `portalFrame`: Bounding box spanning column positions, column widths, height, and beam depth.
 *
 * @param element - The structural element
 * @returns The bounding box enclosing the element
 */
export function elementBounds(element: StructuralElement): Bounds {
  switch (element.type) {
    case 'node': {
      return {
        minX: element.geometry.x,
        minY: element.geometry.y,
        maxX: element.geometry.x,
        maxY: element.geometry.y,
      };
    }
    case 'column': {
      // Calculate column center and half dimensions
      const cx = element.geometry.x + element.geometry.width / 2;
      const cy = element.geometry.y + element.geometry.depth / 2;
      const hw = element.geometry.width / 2;
      const hd = element.geometry.depth / 2;

      // Unrotated corner points, then rotated around center
      const corners = [
        { x: cx - hw, y: cy - hd },
        { x: cx + hw, y: cy - hd },
        { x: cx + hw, y: cy + hd },
        { x: cx - hw, y: cy + hd },
      ].map((p) => rotatePoint(p, { x: cx, y: cy }, element.geometry.rotation));

      return polygonBounds(corners);
    }
    case 'beam': {
      const { start, end, width } = element.geometry;
      const safewidth = Math.max(width || 1, 1); // Avoid zero-width beams for bounding box calculations
      // Angle of the beam centerline
      const a = Math.atan2(end.y - start.y, end.x - start.x);
      // Perpendicular normal offset vector (scaled to half-width)
      const nx = (Math.sin(a) * safewidth) / 2;
      const ny = (-Math.cos(a) * safewidth) / 2;

      // 4 corners of the beam rectangle
      return polygonBounds([
        { x: start.x + nx, y: start.y + ny },
        { x: start.x - nx, y: start.y - ny },
        { x: end.x + nx, y: end.y + ny },
        { x: end.x - nx, y: end.y - ny },
      ]);
    }
    case 'wall': {
      const { start, end, thickness } = element.geometry;
      const safethickness = Math.max(thickness || 1, 1); // Avoid zero-thickness walls for bounding box calculations
      // Angle of the wall centerline
      const a = Math.atan2(end.y - start.y, end.x - start.x);
      // Perpendicular normal offset vector (scaled to half-thickness)
      const nx = (Math.sin(a) * safethickness) / 2;
      const ny = (-Math.cos(a) * safethickness) / 2;

      // 4 corners of the wall rectangle
      return polygonBounds([
        { x: start.x + nx, y: start.y + ny },
        { x: start.x - nx, y: start.y - ny },
        { x: end.x + nx, y: end.y + ny },
        { x: end.x - nx, y: end.y - ny },
      ]);
    }
    case 'slab':
      return polygonBounds(element.geometry.points);

    case 'portalFrame': {
      const g = element.geometry;
      return {
        minX: Math.min(g.start.x, g.end.x) - g.columnWidth / 2,
        minY: Math.min(g.start.y, g.end.y),
        maxX: Math.max(g.start.x, g.end.x) + g.columnWidth / 2,
        maxY: Math.max(g.start.y, g.end.y) + g.height + g.beamDepth,
      };
    }
  default:
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
}

/**
 * Determines whether a point lies inside a 2D polygon using the Ray-Casting algorithm
 * (even-odd rule / Jordan curve theorem).
 *
 * Casts a horizontal ray from point `p` to +infinity and counts intersections with polygon edges.
 * An odd number of intersections indicates the point is inside.
 *
 * @param p - The query point
 * @param points - Array of polygon vertices in order
 * @returns `true` if the point is inside the polygon, `false` otherwise
 */
export function pointInPolygon(p: PagePoint, points: PagePoint[]): boolean {
  let inside = false;

  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i];
    const b = points[j];

    // Check if the horizontal ray through p intersects the edge (a, b)
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Translates a structural element's geometry by a given 2D displacement (dx, dy).
 *
 * Returns a new element instance with updated geometry coordinates (immutable).
 *
 * @param element - The original structural element
 * @param dx - Translation distance along the X axis
 * @param dy - Translation distance along the Y axis
 * @returns A new structural element with updated position
 */
export function translateElement(element: StructuralElement, dx: number, dy: number): StructuralElement {
  switch (element.type) {
    case 'node':
      return {
        ...element,
        geometry: {
          x: element.geometry.x + dx,
          y: element.geometry.y + dy,
        },
      };
    case 'column':
      return {
        ...element,
        geometry: {
          ...element.geometry,
          x: element.geometry.x + dx,
          y: element.geometry.y + dy,
        },
      };
    case 'beam':
      return {
        ...element,
        geometry: {
          ...element.geometry,
          start: { x: element.geometry.start.x + dx, y: element.geometry.start.y + dy },
          end: { x: element.geometry.end.x + dx, y: element.geometry.end.y + dy },
        },
      };
    case 'wall':
      return {
        ...element,
        geometry: {
          ...element.geometry,
          start: { x: element.geometry.start.x + dx, y: element.geometry.start.y + dy },
          end: { x: element.geometry.end.x + dx, y: element.geometry.end.y + dy },
        },
      };
    case 'slab':
      return {
        ...element,
        geometry: {
          points: element.geometry.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
        },
      };
    case 'portalFrame':
      return {
        ...element,
        geometry: {
          ...element.geometry,
          start: { x: element.geometry.start.x + dx, y: element.geometry.start.y + dy },
          end: { x: element.geometry.end.x + dx, y: element.geometry.end.y + dy },
        },
      };
  
  default:
    return element;
  }
}


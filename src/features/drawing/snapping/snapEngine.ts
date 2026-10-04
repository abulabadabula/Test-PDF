import type { StructuralElement } from '../elements/elementTypes';
import type { SnapPoint, SnapSettings, SnapType } from './snamTypes';
import { distance, elementBounds, distanceToSegment } from '../geometry/geometryUtils';
import { snapPointToGrid, type GridOrigin } from './gridUtils';

function lineSegments(
  e: StructuralElement,
): Array<[{ x: number; y: number }, { x: number; y: number }]> {
  switch (e.type) {
    case 'node':
      return [];
    case 'beam':
    case 'wall':
      return [[e.geometry.start, e.geometry.end]];
    case 'portalFrame': {
      const g = e.geometry;
      const topStart = { x: g.start.x, y: g.start.y + g.height };
      const topEnd = { x: g.end.x, y: g.end.y + g.height };
      return [
        [g.start, topStart],
        [g.end, topEnd],
        [topStart, topEnd],
      ];
    }
    case 'slab':
      return e.geometry.points.map((p, i) => [
        p,
        e.geometry.points[(i + 1) % e.geometry.points.length],
      ] as [{ x: number; y: number }, { x: number; y: number }]);
    default:
      return [];
  }
}

function segmentIntersection(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
  d: { x: number; y: number },
) {
  const den =
    (a.x - b.x) * (c.y - d.y) -
    (a.y - b.y) * (c.x - d.x);

  if (Math.abs(den) < 1e-9) return null;

  const px =
    ((a.x * b.y - a.y * b.x) * (c.x - d.x) -
      (a.x - b.x) * (c.x * d.y - c.y * d.x)) / den;
  const py =
    ((a.x * b.y - a.y * b.x) * (c.y - d.y) -
      (a.y - b.y) * (c.x * d.y - c.y * d.x)) / den;

  const onSegment = (value: number, first: number, second: number) =>
    value >= Math.min(first, second) - 1e-6 &&
    value <= Math.max(first, second) + 1e-6;

  return onSegment(px, a.x, b.x) &&
    onSegment(py, a.y, b.y) &&
    onSegment(px, c.x, d.x) &&
    onSegment(py, c.y, d.y)
    ? { x: px, y: py }
    : null;
}

const defaultSettings: SnapSettings = {
  enabled: true,
  types: {
    grid: true,
    endpoint: true,
    midpoint: true,
    center: true,
    intersection: true,
    nearest: true,
  },
  gridSize: 100,
  tolerancePx: 10,
};

const endpoints = (e: StructuralElement) => {
  switch (e.type) {
    case 'node':
      return [{ x: e.geometry.x, y: e.geometry.y }];
    case 'column':
      return [{
        x: e.geometry.x + e.geometry.width / 2,
        y: e.geometry.y + e.geometry.depth / 2,
      }];
    case 'beam':
    case 'wall':
      return [e.geometry.start, e.geometry.end];
    case 'slab':
      return e.geometry.points;
    case 'portalFrame':
      return [
        e.geometry.start,
        e.geometry.end,
        { x: e.geometry.start.x, y: e.geometry.start.y + e.geometry.height },
        { x: e.geometry.end.x, y: e.geometry.end.y + e.geometry.height },
      ];
    default:
      return [];
  }
};

export function findSnapPoint(
  cursor: { x: number; y: number },
  elements: StructuralElement[],
  zoom: number,
  settings: Partial<SnapSettings> = {},
  gridOrigin: GridOrigin = { x: 0, y: 0 },
): SnapPoint | null {
  const s: SnapSettings = {
    ...defaultSettings,
    ...settings,
    types: { ...defaultSettings.types, ...settings.types },
  };

  if (!s.enabled) return null;

  const tolerance = s.tolerancePx / Math.max(zoom, 0.0001);
  const objectCandidates: SnapPoint[] = [];

  for (const e of elements) {
    if (s.types.endpoint) {
      for (const p of endpoints(e)) {
        objectCandidates.push({
          point: p,
          type: 'endpoint',
          elementId: e.id,
          distance: distance(cursor, p),
        });
      }
    }

    if (s.types.center) {
      const b = elementBounds(e);
      const p = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
      objectCandidates.push({ point: p, type: 'center', elementId: e.id, distance: distance(cursor, p) });
    }

    if (s.types.midpoint) {
      const points = endpoints(e);
      for (let i = 0; i < points.length - 1; i += 1) {
        const p = {
          x: (points[i].x + points[i + 1].x) / 2,
          y: (points[i].y + points[i + 1].y) / 2,
        };
        objectCandidates.push({ point: p, type: 'midpoint', elementId: e.id, distance: distance(cursor, p) });
      }
    }

    if (s.types.nearest) {
      for (const [start, end] of lineSegments(e)) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const lengthSquared = dx * dx + dy * dy;
        if (lengthSquared <= 1e-12) continue;

        const t = Math.max(0, Math.min(1,
          ((cursor.x - start.x) * dx + (cursor.y - start.y) * dy) / lengthSquared));
        const p = { x: start.x + t * dx, y: start.y + t * dy };
        objectCandidates.push({
          point: p,
          type: 'nearest',
          elementId: e.id,
          distance: distanceToSegment(cursor, start, end),
        });
      }
    }
  }

  if (s.types.intersection) {
    for (let i = 0; i < elements.length; i += 1) {
      for (let j = i + 1; j < elements.length; j += 1) {
        for (const [a, b] of lineSegments(elements[i])) {
          for (const [c, d] of lineSegments(elements[j])) {
            const point = segmentIntersection(a, b, c, d);
            if (point) objectCandidates.push({ point, type: 'intersection', distance: distance(cursor, point) });
          }
        }
      }
    }
  }

  const validObjectCandidates = objectCandidates.filter(
    (candidate) => candidate.distance <= tolerance,
  );

  if (validObjectCandidates.length > 0) {
    const priority: Record<SnapType, number> = {
      intersection: 0,
      endpoint: 1,
      midpoint: 2,
      center: 3,
      nearest: 4,
      grid: 5,
    };

    return validObjectCandidates.sort((a, b) =>
      a.distance - b.distance || priority[a.type] - priority[b.type]
    )[0];
  }

  // Grid snap is a deterministic fallback. It is not rejected merely
  // because the cursor is farther than the object-snap tolerance.
  if (s.types.grid && s.gridSize > 0) {
    const point = snapPointToGrid(cursor, s.gridSize, gridOrigin);
    return { point, type: 'grid', distance: distance(cursor, point) };
  }

  return null;
}

export function snapPoint(
  cursor: { x: number; y: number },
  elements: StructuralElement[],
  zoom: number,
  settings?: Partial<SnapSettings>,
  gridOrigin?: GridOrigin,
) {
  return findSnapPoint(cursor, elements, zoom, settings, gridOrigin)?.point ?? cursor;
}

export function snapTypeLabel(type: SnapType) {
  return {
    grid: 'Grid',
    endpoint: 'Endpoint',
    midpoint: 'Midpoint',
    center: 'Center',
    intersection: 'Intersection',
    nearest: 'Nearest',
  }[type];
}

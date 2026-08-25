import type { ElementStyle, StructuralElementType } from './elementTypes';
import {
  realMmToPagePt,
  pagePtToRealMm,
  getCurrentDrawingScale,
} from '@/core/coordinate/engineeringScale';

export const DEFAULT_PLAN_SCALE = 100;

export { MM_TO_PT } from '@/core/coordinate/engineeringScale';

/**
 * Convert a real engineering dimension in millimetres to PDF page points.
 * The result depends on the drawing scale, NOT on viewer zoom.
 */
export function mmToPageUnits(mm: number, scaleDenominator = DEFAULT_PLAN_SCALE, scaleNumerator = 1): number {
  return realMmToPagePt(mm, scaleNumerator, scaleDenominator);
}

export function pageUnitsToMm(pageUnits: number, scaleDenominator?: number, scaleNumerator?: number): number {
  const current = getCurrentDrawingScale();
  const denominator = scaleDenominator ?? current.denominator;
  const numerator = scaleNumerator ?? current.numerator;
  return pagePtToRealMm(pageUnits, numerator, denominator);
}

/** Real engineering dimensions remain the source of truth for defaults. */
export const STRUCTURAL_REAL_DEFAULTS = {
  column: {
    realWidth: 90,
    realDepth: 90,
    rotation: 0,
    section: '90×90',
    material: 'Concrete',
  },
  beam: {
    realWidth: 90,
    realDepth: 450,
    section: '90×450',
    material: 'Concrete',
  },
  wall: {
    realThickness: 190,
    wallType: 'Structural',
    material: 'Concrete',
  },
  slab: {
    realThickness: 150,
    level: 'Level 1',
    material: 'Concrete',
  },
  portalFrame: {
    realHeight: 4000,
    realColumnWidth: 90,
    realColumnDepth: 90,
    realBeamWidth: 90,
    realBeamDepth: 450,
    section: '90×450',
    material: 'Steel',
  },
} as const;

/**
 * Generate page-coordinate geometry from real engineering dimensions.
 * This MUST be called with the current drawing scale whenever a new element
 * is created. Existing geometry is intentionally left unchanged when the
 * scale input changes, because it is tied to the PDF page itself.
 */
export function getStructuralDefaults(scaleDenominator = DEFAULT_PLAN_SCALE, scaleNumerator = 1) {
  const s = scaleDenominator > 0 ? scaleDenominator : DEFAULT_PLAN_SCALE;
  const n = scaleNumerator > 0 ? scaleNumerator : 1;
  return {
    column: {
      ...STRUCTURAL_REAL_DEFAULTS.column,
      width: mmToPageUnits(STRUCTURAL_REAL_DEFAULTS.column.realWidth, s, n),
      depth: mmToPageUnits(STRUCTURAL_REAL_DEFAULTS.column.realDepth, s, n),
    },
    beam: {
      ...STRUCTURAL_REAL_DEFAULTS.beam,
      width: mmToPageUnits(STRUCTURAL_REAL_DEFAULTS.beam.realWidth, s, n),
      depth: mmToPageUnits(STRUCTURAL_REAL_DEFAULTS.beam.realDepth, s, n),
    },
    wall: {
      ...STRUCTURAL_REAL_DEFAULTS.wall,
      thickness: mmToPageUnits(STRUCTURAL_REAL_DEFAULTS.wall.realThickness, s, n),
    },
    slab: {
      ...STRUCTURAL_REAL_DEFAULTS.slab,
      thickness: STRUCTURAL_REAL_DEFAULTS.slab.realThickness,
    },
    portalFrame: {
      ...STRUCTURAL_REAL_DEFAULTS.portalFrame,
      height: mmToPageUnits(STRUCTURAL_REAL_DEFAULTS.portalFrame.realHeight, s, n),
      columnWidth: mmToPageUnits(STRUCTURAL_REAL_DEFAULTS.portalFrame.realColumnWidth, s, n),
      columnDepth: mmToPageUnits(STRUCTURAL_REAL_DEFAULTS.portalFrame.realColumnDepth, s, n),
      beamWidth: mmToPageUnits(STRUCTURAL_REAL_DEFAULTS.portalFrame.realBeamWidth, s, n),
      beamDepth: mmToPageUnits(STRUCTURAL_REAL_DEFAULTS.portalFrame.realBeamDepth, s, n),
    },
  };
}

/** Backward-compatible 1:100 defaults for code that still imports this name. */
export const STRUCTURAL_DEFAULTS = getStructuralDefaults(DEFAULT_PLAN_SCALE, 1);

export const DEFAULT_ELEMENT_STYLE: ElementStyle = {
  color: '#2563eb',
  strokeWidth: 1.5,
  opacity: 1,
  fillColor: 'transparent',
  fillOpacity: 0.12,
};

export const ELEMENT_COLORS = {
  column: '#2563eb',
  beam: '#2563eb',
  wall: '#7c3aed',
  wallCenterline: '#7c3aed',
  portalColumn: '#2563eb',
  portalBeam: '#dc2626',
  slab: '#059669',
} as const;

export const prefixForType = (type: StructuralElementType): string => ({
  node: 'N',
  column: 'C',
  beam: 'B',
  wall: 'W',
  slab: 'S',
  portalFrame: 'PF',
}[type]);

export const structuralTypeLabel = (type: StructuralElementType): string => ({
  node: 'Nodes',
  column: 'Columns',
  beam: 'Beams',
  wall: 'Walls',
  slab: 'Slabs',
  portalFrame: 'Portal Frames',
}[type]);
import type { PagePoint } from '@/core/coordinate/coordinateTypes';

export type StructuralElementType =
  | 'node'
  | 'column'
  | 'beam'
  | 'wall'
  | 'slab'
  | 'portalFrame';

export interface ElementStyle {
  color: string;
  strokeWidth: number;
  opacity: number;
  fillColor?: string;
  fillOpacity?: number;
}

export interface StructuralBase {
  id: string;
  type: StructuralElementType;
  pageIndex: number;
  layerId: string;
  properties: Record<string, string | number>;
  style: ElementStyle;
  label: string;
  createdAt: string;
  updatedAt: string;
  zIndex: number;
}

export interface NodeGeometry {
  x: number;
  y: number;
}

export interface ColumnGeometry {
  x: number;
  y: number;
  width: number;
  depth: number;
  rotation: number;
}
export interface BeamGeometry {
  start: PagePoint;
  end: PagePoint;
  width: number;
  depth: number;
}
export interface WallGeometry {
  start: PagePoint;
  end: PagePoint;
  thickness: number;
}
export interface SlabGeometry {
  points: PagePoint[];
}
export interface PortalFrameGeometry {
  start: PagePoint;
  end: PagePoint;
  height: number;
  columnWidth: number;
  columnDepth: number;
  beamWidth: number;
  beamDepth: number;
}

export interface NodeElement extends StructuralBase {
  type: 'node';
  geometry: NodeGeometry;
  properties: {
    label: string;
    x?: number;
    y?: number;
  };
}

export interface ColumnElement extends StructuralBase {
  type: 'column';
  geometry: ColumnGeometry;
  properties: {
    label: string;
    section: string;
    material: string;
    nodeId?: string;
  };
}
export interface BeamElement extends StructuralBase {
  type: 'beam';
  geometry: BeamGeometry;
  properties: {
    label: string;
    section: string;
    material: string;
    startNodeId?: string;
    endNodeId?: string;
  };
}
export interface WallElement extends StructuralBase {
  type: 'wall';
  geometry: WallGeometry;
  properties: {
    label: string;
    wallType: string;
    material: string;
    startNodeId?: string;
    endNodeId?: string;
  };
}
export interface SlabElement extends StructuralBase {
  type: 'slab';
  geometry: SlabGeometry;
  properties: {
    label: string;
    thickness: number;
    material: string;
    level: string;
  };
}
export interface PortalFrameElement extends StructuralBase {
  type: 'portalFrame';
  geometry: PortalFrameGeometry;
  properties: {
    label: string;
    section: string;
    material: string;
    startNodeId?: string;
    endNodeId?: string;
  };
}

export type StructuralElement =
  | NodeElement
  | ColumnElement
  | BeamElement
  | WallElement
  | SlabElement
  | PortalFrameElement
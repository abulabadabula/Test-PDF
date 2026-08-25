export type SnapType = 'grid' | 'endpoint' | 'midpoint' | 'center' | 'intersection' | 'nearest';

export interface SnapPoint {
  point: { x:number; y:number };
  type: SnapType;
  elementId?: string;
  distance: number;
}

export interface SnapSettings {
  enabled: boolean;
  types: Partial<Record<SnapType, boolean>>;
  gridSize: number;
  tolerancePx: number;
}

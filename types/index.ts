export interface Point {
  x: number;
  y: number;
}

export interface Shape {
  id: string;
  type: 'rect' | 'circle' | 'line' | 'text' | 'freehand';
  points: Point[];
  color: string;
  strokeWidth: number;
  layerId: string;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  shapes: Shape[];
}

export interface Project {
  id: string;
  name: string;
  pdfUrl: string;
  layers: Layer[];
  createdAt: string;
  updatedAt: string;
}
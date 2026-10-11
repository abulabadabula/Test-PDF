export type PlanSheetRole = 'structural' | 'reference' | 'underlay';

export interface CropRect {
  /** Crop rectangle in unscaled PDF page coordinates (points), top-left origin. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlanSheet {
  id: string;
  name: string;
  sourcePage: number;
  crop: CropRect;
  rotation: number;
  role: PlanSheetRole;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CropSession {
  sourcePage: number;
  sheetId: string | null;
}

export interface PlanSheetState {
  sheets: PlanSheet[];
  /** Sheet used as the fixed reference for floor-to-floor alignment. */
  baseSheetId: string | null;
  /** Sheet currently shown for editing on the canvas. */
  activeSheetId: string | null;
  cropMode: boolean;
  cropSelection: CropRect | null;
  cropSession: CropSession | null;
}

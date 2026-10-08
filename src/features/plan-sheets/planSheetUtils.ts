import type { RootState } from '@/app/store';
import type { Shape } from '@/app/store/slices/drawingSlice';
import type { PlanSheet } from './planSheetTypes';

export function shapeMatchesPlanSheet(
  shape: Shape,
  sheet: PlanSheet | null,
  currentPage: number,
): boolean {
  if (!sheet) return shape.pageIndex === currentPage;
  if (shape.pageIndex !== sheet.sourcePage) return false;

  // Newer shapes are sheet-aware.
  if (shape.sheetId) return shape.sheetId === sheet.id;

  // Legacy shapes that pre-date Plan Sheets remain visible until they are
  // explicitly assigned to a sheet.
  return true;
}

export function activeSheetForState(state: RootState): PlanSheet | null {
  const id = state.planSheet.activeSheetId;
  return state.planSheet.sheets.find((sheet) => sheet.id === id) ?? null;
}

export function sourcePageForActiveSheet(state: RootState): number {
  return activeSheetForState(state)?.sourcePage ?? state.pdf.currentPage;
}

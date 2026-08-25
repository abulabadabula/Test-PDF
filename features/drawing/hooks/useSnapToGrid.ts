// src/features/drawing/hooks/useSnapToGrid.ts

import { useCallback } from 'react';
import { useAppSelector } from '@/app/store/hooks';

export function useSnapToGrid() {
  // 直接读取 uiSlice 中的扁平状态
  const snapToGrid = useAppSelector(state => state.ui.snapToGrid);
  const gridSize = useAppSelector(state => state.ui.gridSize);
  
  return useCallback((x: number, y: number) => {
    if (!snapToGrid) return { x, y };
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize
    };
  }, [snapToGrid, gridSize]);
}
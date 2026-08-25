// src/components/editor/EditorStatusBar.tsx

import { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/app/store/hooks';
import { setScale, setCurrentPage } from '@/app/store/slices/pdfSlice';
import {
  setOriginMode,
  selectPageCoordinateSystem,
  clearPageOrigin,
} from '@/app/store/slices/pageCoordinateSlice';
import {
  subscribeCursorCoordinate,
  type CursorCoordinateEvent,
} from '@/core/coordinate/coordinateEvents';
import { ZoomIn, ZoomOut, Maximize, Minimize, Crosshair, X, Disc} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function EditorStatusBar({
  onFitWidth,
  onFitPage,
}: {
  onFitWidth?: () => void;
  onFitPage?: () => void;
}) {
  const dispatch = useAppDispatch();
  const { currentPage, totalPages, scale } = useAppSelector((s) => s.pdf);
  const pageCoordinateSystem = useAppSelector((state) =>
    selectPageCoordinateSystem( state, currentPage )
  );
  const originMode = useAppSelector((state) => state.pageCoordinate.originMode);
  const [cursor, setCursor] =
    useState<CursorCoordinateEvent | null>(null);

  useEffect(() => {
    return subscribeCursorCoordinate(setCursor);
  }, []);

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  const zoomIn = () => dispatch( setScale( Math.min( 4.0, scale + 0.25)));

  const zoomOut = () => dispatch( setScale( Math.max( 0.25, scale - 0.25)));

  const coordinateUnit = pageCoordinateSystem.unit;
  const scaleText =
    pageCoordinateSystem.scaleNumerator === 1
      ? `1:${pageCoordinateSystem.scaleDenominator}`
      : `${pageCoordinateSystem.scaleNumerator}:${pageCoordinateSystem.scaleDenominator}`;

  /*
   * Number of decimal places for engineering coordinate.
   */
  const engineeringDecimals = coordinateUnit === 'm' ? 3
      : coordinateUnit === 'cm' ? 2 : 1;

  /*
   * PDF page coordinates are stored in PDF points.
   *
   * These are NOT engineering coordinates.
   *
   * They represent the cursor position in the
   * persistent PDF/page coordinate system.
   */
  const pageX = cursor ? cursor.pagePoint.x : null;
  const pageY = cursor ? cursor.pagePoint.y : null;

  /*
   * Engineering coordinates:
   *
   * - based on the user-defined Origin
   * - based on the current drawing scale
   * - X positive to the right
   * - Y positive upward
   *
   * These values are already calculated by
   * pagePointToEngineeringUnit().
   */
  const engineeringX = cursor ? cursor.engineeringPoint.x : null;
  const engineeringY = cursor ? cursor.engineeringPoint.y : null;

  // 【新增】判断当前页面是否已经设置了自定义原点（默认原点是 0,0）
  const hasCustomOrigin =
    pageCoordinateSystem.origin.x !== 0 ||
    pageCoordinateSystem.origin.y !== 0;

  // 【修正】只要处于“等待点击”状态，或者“已经有自定义原点”，取消按钮就应该有效
  const isCancelDisabled = !originMode && !hasCustomOrigin;

  // 【修正】取消按钮点击事件
  const handleCancelOrigin = () => {
    // 1. 清除已设置的原点，恢复默认计算逻辑
    dispatch(clearPageOrigin({ pageIndex: currentPage }));
    
    // 2. 如果当前正处于“等待点击画布”的状态，需要退出该状态
    if (originMode) {
      dispatch(setOriginMode(false));
    }
  };

  // 👇 3. 新增：切换全屏的方法
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      // 请求整个文档根元素进入全屏
      document.documentElement.requestFullscreen().catch(err => {
        console.log(`全屏请求失败: ${err.message}`);
      });
    } else {
      // 退出全屏
      document.exitFullscreen();
    }
  };

  return (
    <footer className="h-8 flex items-center justify-between px-3 bg-editor-toolbar border-t border-border text-xs text-muted-foreground shrink-0">
      {/* =========================================================
          LEFT SIDE
          ========================================================= */}
      <div className="flex items-center gap-3 min-w-0 overflow-hidden">
        {/* Page */}
        <span className="whitespace-nowrap">
          Page {currentPage} of {totalPages || '--'}
        </span>
        {/* Page navigation */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => dispatch( setCurrentPage( Math.max( 1, currentPage - 1)))}>‹</Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => dispatch( setCurrentPage( Math.min( totalPages, currentPage + 1)))}>›</Button>
          </div>
        )}
        <div className="w-px h-4 bg-border" />
        {/* =====================================================
            DRAWING SCALE
            ===================================================== */}
        <span className="font-mono whitespace-nowrap">
          Scale{' '}
          <strong>
            {scaleText}
          </strong>
        </span>
        {/* =====================================================
            SET ORIGIN
            ===================================================== */}
        <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1 whitespace-nowrap" onClick={() => dispatch( setOriginMode(true))}>
          <Crosshair className="w-3.5 h-3.5" />
          Set Origin
        </Button>

        {/* =====================================================
            CANCEL ORIGIN BUTTON (NEW)
            ===================================================== */}
        <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1 whitespace-nowrap" disabled={isCancelDisabled} onClick={handleCancelOrigin} title="取消设置原点">
          <X className="w-3.5 h-3.5" />
          Cancel
        </Button>

        <div className="w-px h-4 bg-border" />
        {/* =====================================================
            PDF PAGE COORDINATES
            ===================================================== */}
        <span className="font-mono whitespace-nowrap" title="PDF page X coordinate">
          PDF X:{' '}
          {pageX !== null
            ? pageX.toFixed(2)
            : '—'}
          {' pt'}
        </span>
        <span className="font-mono whitespace-nowrap" title="PDF page Y coordinate">
          PDF Y:{' '}
          {pageY !== null
            ? pageY.toFixed(2)
            : '—'}
          {' pt'}
        </span>
        <div className="w-px h-4 bg-border" />
        {/* =====================================================
            ENGINEERING COORDINATES
            ===================================================== */}
        <span className="font-mono whitespace-nowrap font-medium" title="Engineering X coordinate based on current origin and drawing scale">
          ENG X:{' '}
          {engineeringX !== null
            ? engineeringX.toFixed(
                engineeringDecimals
              )
            : '—'}
          {' '}
          {coordinateUnit}
        </span>
        <span className="font-mono whitespace-nowrap font-medium" title="Engineering Y coordinate based on current origin and drawing scale">
          ENG Y:{' '}
          {engineeringY !== null
            ? engineeringY.toFixed(
                engineeringDecimals
              )
            : '—'}
          {' '}
          {coordinateUnit}
        </span>
      </div>

      {/* =========================================================
          RIGHT SIDE
          ========================================================= */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Zoom Out */}
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={zoomOut}>
          <ZoomOut className="w-3.5 h-3.5" />
        </Button>
        {/* Zoom percentage */}
        <span className="w-12 text-center font-mono">
          {Math.round(  scale * 100)} %
        </span>
        {/* Zoom In */}
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={zoomIn}>
          <ZoomIn className="w-3.5 h-3.5" />
        </Button>
        <div className="w-px h-3 bg-border mx-1" />
        {/* Fit Width */}
        <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={onFitWidth}>
          Fit Width
        </Button>
        {/* Fit Page */}
        <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={onFitPage}>
          Fit Page
        </Button>
        {/* Reset zoom */}
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => dispatch( setScale(1.0))}>
          <Disc className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={handleToggleFullscreen}
          title={isFullscreen ? "退出全屏 (Esc)" : "进入全屏"}
        >
          {isFullscreen ? (
            <Minimize className="w-3.5 h-3.5" />
          ) : (
            <Maximize className="w-3.5 h-3.5" />
          )}
        </Button>
      </div>
    </footer>
  );
}
import React, { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { useAppSelector, useAppDispatch } from '@/app/store/hooks';
import { setScale, setCurrentPage } from '@/app/store/slices/pdfSlice';
import { PdfCanvas } from './PdfCanvas';
import { PdfDropZone } from './PdfDropZone';
import { usePdfDocument } from './usePdfDocument';
import { AnnotationCanvas } from '@/features/drawing/AnnotationCanvas';
import { DimensionOverlay } from '@/features/layers/DimensionOverlay';
import { LegendPanel } from '@/features/layers/LegendPanel';
import { usePdfFit } from './usePdfFit';

export const PdfViewer = forwardRef<{ handleFitWidth: () => void; handleFitPage: () => void }, {}>((_, ref) => {
  const dispatch = useAppDispatch();
  const { document, loadPdf } = usePdfDocument();

  const scale = useAppSelector((state) => state.pdf.scale);
  const currentPage = useAppSelector((state) => state.pdf.currentPage);
  const totalPages = useAppSelector((state) => state.pdf.totalPages);
  const rotation = useAppSelector((state) => state.pdf.pageRotation);
  const containerRef = useRef<HTMLDivElement>(null);
  const dimPdfBackground = useAppSelector((state) => state.ui.dimPdfBackground);  

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  const { handleFitWidth, handleFitPage } = usePdfFit(containerRef);

  useImperativeHandle(ref, () => ({ handleFitWidth, handleFitPage }));

  // 空白画布模式状态
  const [isBlankMode, setIsBlankMode] = useState(false);
  const handleFileSelect = useCallback((file: File) => {
    setIsBlankMode(false); // 选择文件时退出空白模式
    loadPdf(file);
  }, [loadPdf]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      dispatch(setScale(Math.max(0.25, Math.min(4.0, scale + delta))));
    }
  }, [dispatch, scale]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && isSpacePressed)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  }, [isSpacePressed, panOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.code === 'Space') { e.preventDefault(); setIsSpacePressed(true); }
      if (e.key === 'ArrowLeft') dispatch(setCurrentPage(Math.max(1, currentPage - 1)));
      else if (e.key === 'ArrowRight') dispatch(setCurrentPage(Math.min(totalPages, currentPage + 1)));
      else if (e.key === '+' || e.key === '=') dispatch(setScale(Math.min(4.0, scale + 0.25)));
      else if (e.key === '-') dispatch(setScale(Math.max(0.25, scale - 0.25)));
      else if (e.key === '0') dispatch(setScale(1.0));
    };
    const handleKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') setIsSpacePressed(false); };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [dispatch, currentPage, totalPages, scale]);

  // 👇 修改渲染逻辑：分三种情况处理
  // 1. 无 PDF 且非空白模式：显示上传区域
  if (!document && !isBlankMode) {
    return <PdfDropZone onFileSelect={handleFileSelect} onBlankCanvas={() => setIsBlankMode(true)} />;
  }

  // 2. 无 PDF 但处于空白模式：显示空白建模画布
  if (!document && isBlankMode) {
    return (
      <div className="flex flex-col h-full w-full bg-editor-workspace relative">
        <div
          ref={containerRef}
          className="relative flex-1 overflow-hidden select-none"
          style={{ cursor: isPanning ? 'grabbing' : isSpacePressed ? 'grab' : 'default' }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            {/* 空白画布容器，给予最小尺寸以确保交互区域存在 */}
            <div className="relative shadow-sm bg-white w-full h-full min-w-[800px] min-h-[600px]">
              <AnnotationCanvas />
              <DimensionOverlay />
            </div>
          </div>
          <LegendPanel />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-editor-workspace relative">
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden select-none"
        style={{ cursor: isPanning ? 'grabbing' : isSpacePressed ? 'grab' : 'default' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)` }}
        >
          <div className="relative shadow-sm bg-white">
            <PdfCanvas document={document} />

            {/* --- 新增：PDF 背景淡显遮罩层 --- */}
            {/* z-[5] 确保它在 PDF (z-0) 之上，但在 AnnotationCanvas (z-10) 之下 */}
            {/* pointer-events-none 确保它不会阻挡鼠标与下方标注 Canvas 的交互 */}
            {dimPdfBackground && (
              <div className="absolute inset-0 bg-white/60 pointer-events-none z-[5]" />
            )}

            <AnnotationCanvas />
            <DimensionOverlay />
          </div>
        </div>
        <LegendPanel />
      </div>
    </div>
  );
});
PdfViewer.displayName = 'PdfViewer';
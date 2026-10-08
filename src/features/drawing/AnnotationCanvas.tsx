// src/features/drawing/AnnotationCanvas.tsx

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { addShape, selectShapesBySheet, selectSelectedShapes, selectShape } from '@/app/store/slices/drawingSlice';
import { ensurePage, ensureSheet, selectCoordinateSystem, selectOriginMode } from '@/app/store/slices/pageCoordinateSlice';
import type { Shape, TextShape } from '@/app/store/slices/drawingSlice';
import type { StructuralElement } from './elements/elementTypes';
import { renderShape } from './ShapeRenderer';
import { useHitTest } from './hooks/useHitTest';
import { useCanvasEvents } from './hooks/useCanvasEvents';
import { StructuralPropertyDialog } from './StructuralPropertyDialog';
import { setCurrentDrawingScale } from '@/core/coordinate/engineeringScale';
import { selectActivePlanSheet, selectCropMode } from '@/app/store/slices/planSheetSlice';
import { drawPageGrid } from './snapping/gridUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function AnnotationCanvas() {
  const dispatch = useAppDispatch();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const displayScale = useAppSelector((state) => state.pdf.scale);
  const currentPage = useAppSelector((state) => state.pdf.currentPage);
  const activePlanSheet = useAppSelector(selectActivePlanSheet);
  const cropMode = useAppSelector(selectCropMode);
  const layers = useAppSelector((state) => state.layer.layers);
  const activeLayerId = useAppSelector((state) => state.layer.activeLayerId);
  const shapes = useAppSelector((state) =>
    selectShapesBySheet(
      state,
      activePlanSheet?.id ?? null,
      activePlanSheet?.sourcePage ?? currentPage,
    ),
  );
  const selectedShapes = useAppSelector(selectSelectedShapes);
  const pageCoordinateSystem = useAppSelector((state) =>
    selectCoordinateSystem(state, currentPage, activePlanSheet?.id ?? null)
  );
  const originMode = useAppSelector(selectOriginMode);

  const scaleNumerator = pageCoordinateSystem.scaleNumerator;
  const scaleDenominator = pageCoordinateSystem.scaleDenominator;

  const [tempShape, setTempShape] = useState<Shape | null>(null);
  const [snapPoint, setSnapPoint] = useState<{ x: number; y: number } | null>(null);
  const [selectionRect, setSelectionRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [propertyElement, setPropertyElement] = useState<StructuralElement | null>(null);
  const [textDialog, setTextDialog] = useState({ x: 0, y: 0, open: false });
  const [textInput, setTextInput] = useState('');
  const [canvasSizeVersion, setCanvasSizeVersion] = useState(0);

  const showElementLabels = useAppSelector((state) => state.ui.showElementLabels);
  const showElementSections = useAppSelector((state) => state.ui.showElementSections);
  const showGrid = useAppSelector((state) => state.ui.showGrid);
  const gridSize = useAppSelector((state) => state.ui.gridSize);

  useEffect(() => {
    if (activePlanSheet?.id) {
      dispatch(ensureSheet({ sheetId: activePlanSheet.id, pageIndex: activePlanSheet.sourcePage }));
    } else {
      dispatch(ensurePage({ pageIndex: currentPage }));
    }
  }, [dispatch, currentPage, activePlanSheet?.id]);

  useEffect(() => {
    setCurrentDrawingScale(scaleNumerator, scaleDenominator);
  }, [scaleNumerator, scaleDenominator]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;

    if (!parent || typeof ResizeObserver === 'undefined') return;

    let raf = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setCanvasSizeVersion((v) => v + 1));
    });

    observer.observe(parent);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  const hitTest = useHitTest(
    shapes,
    layers,
    5 / Math.max(displayScale, 0.0001)
  );

  const openProperties = useCallback(
    (shape: Shape | null) => {
      if (shape && 'geometry' in shape) {
        dispatch(selectShape({ id: shape.id }));
        setPropertyElement(shape as StructuralElement);
      }
    },
    [dispatch]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frame = requestAnimationFrame(() => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (!width || !height) return;

      canvas.width = Math.max(1, Math.ceil(width * dpr));
      canvas.height = Math.max(1, Math.ceil(height * dpr));

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(displayScale * dpr, 0, 0, displayScale * dpr, 0, 0);

      const crop =
        !cropMode &&
        activePlanSheet &&
        activePlanSheet.sourcePage === currentPage
          ? activePlanSheet.crop
          : null;

      // The PDF canvas displays only the crop window, while the structural
      // model continues to use source-page coordinates. Shift the drawing
      // context rather than changing any stored geometry.
      if (crop) {
        ctx.translate(-crop.x, -crop.y);
      }

      // Grid geometry is kept in page coordinates. Zoom only changes the
      // display transform, so grid spacing and snap spacing stay identical.
      if (showGrid) {
        drawPageGrid(ctx, {
          pageWidth:
            width / Math.max(displayScale, 0.0001) + (crop?.x ?? 0),
          pageHeight:
            height / Math.max(displayScale, 0.0001) + (crop?.y ?? 0),
          gridSize,
          origin: pageCoordinateSystem.origin,
          displayScale,
          devicePixelRatio: dpr,
        });
      }

      const visible = new Set(
        layers.filter((layer) => layer.visible).map((layer) => layer.id)
      );

      const visibleShapes = shapes.filter((s) => visible.has(s.layerId));
      const nonPointShapes = visibleShapes.filter((s) => s.type !== 'point');
      const pointShapes = visibleShapes.filter((s) => s.type === 'point');

      nonPointShapes.forEach((shape) => {
        renderShape(ctx, shape, selectedShapes.some((selected) => selected.id === shape.id), {
          showLabels: showElementLabels,
          showSections: showElementSections,
        });
      });

      pointShapes.forEach((shape) => {
        renderShape(ctx, shape, selectedShapes.some((selected) => selected.id === shape.id), {
          showLabels: showElementLabels,
          showSections: showElementSections,
        });
      });

      if (tempShape) {
        renderShape(ctx, tempShape, false, {
          showLabels: showElementLabels,
          showSections: showElementSections,
        });
      }

      if (selectionRect) {
        ctx.save();
        ctx.strokeStyle = '#2563eb';
        ctx.fillStyle = 'rgba(37,99,235,.08)';
        ctx.lineWidth = 1 / displayScale;
        ctx.setLineDash([5 / displayScale, 4 / displayScale]);
        ctx.fillRect(selectionRect.x, selectionRect.y, selectionRect.width, selectionRect.height);
        ctx.strokeRect(selectionRect.x, selectionRect.y, selectionRect.width, selectionRect.height);
        ctx.restore();
      }

      if (snapPoint) {
        ctx.save();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1 / displayScale;
        ctx.beginPath();
        ctx.moveTo(snapPoint.x - 7 / displayScale, snapPoint.y);
        ctx.lineTo(snapPoint.x + 7 / displayScale, snapPoint.y);
        ctx.moveTo(snapPoint.x, snapPoint.y - 7 / displayScale);
        ctx.lineTo(snapPoint.x, snapPoint.y + 7 / displayScale);
        ctx.stroke();
        ctx.restore();
      }

      if (
        Number.isFinite(pageCoordinateSystem.origin.x) &&
        Number.isFinite(pageCoordinateSystem.origin.y)
      ) {
        const ox = pageCoordinateSystem.origin.x;
        const oy = pageCoordinateSystem.origin.y;

        ctx.save();
        ctx.strokeStyle = originMode ? '#ef4444' : '#16a34a';
        ctx.lineWidth = 1 / displayScale;
        const size = 8 / displayScale;

        ctx.beginPath();
        ctx.moveTo(ox - size, oy);
        ctx.lineTo(ox + size, oy);
        ctx.moveTo(ox, oy - size);
        ctx.lineTo(ox, oy + size);
        ctx.stroke();

        ctx.fillStyle = originMode ? '#ef4444' : '#16a34a';
        ctx.font = `${10 / displayScale}px sans-serif`;
        ctx.fillText('0,0', ox + 10 / displayScale, oy - 10 / displayScale);
        ctx.restore();
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [
    shapes,
    tempShape,
    selectedShapes,
    displayScale,
    layers,
    snapPoint,
    selectionRect,
    canvasSizeVersion,
    pageCoordinateSystem,
    originMode,
    activePlanSheet,
    cropMode,
    showElementLabels,
    showElementSections,
    showGrid,
    gridSize,
  ]);

  const submitText = useCallback(() => {
    if (textInput.trim()) {
      dispatch(
        addShape({
          type: 'text',
          x: textDialog.x,
          y: textDialog.y,
          text: textInput.trim(),
          fontSize: 16,
          fontFamily: 'sans-serif',
          layerId: activeLayerId,
          pageIndex: currentPage,
          sheetId: activePlanSheet?.id,
          color: '#000000',
          strokeWidth: 1,
          opacity: 1,
          zIndex: 0,
        } as Omit<TextShape, 'id' | 'createdAt' | 'updatedAt'>)
      );
    }

    setTextDialog({ x: 0, y: 0, open: false });
    setTextInput('');
  }, [dispatch, textInput, textDialog.x, textDialog.y, activeLayerId, currentPage, activePlanSheet?.id]);

  useCanvasEvents(
    canvasRef,
    hitTest,
    tempShape,
    setTempShape,
    (x, y) => setTextDialog({ x, y, open: true }),
    setSnapPoint,
    openProperties,
    setSelectionRect
  );

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full z-10"
        style={{ pointerEvents: 'auto' }}
      />

      <Dialog
        open={textDialog.open}
        onOpenChange={(open) => setTextDialog((current) => ({ ...current, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Text</DialogTitle>
          </DialogHeader>

          <Input
            value={textInput}
            onChange={(event) => setTextInput(event.target.value)}
            autoFocus
          />

          <DialogFooter>
            <Button type="button" onClick={submitText}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StructuralPropertyDialog
        element={propertyElement}
        open={propertyElement !== null}
        scaleNumerator={scaleNumerator}
        scaleDenominator={scaleDenominator}
        onOpenChange={(open) => {
          if (!open) setPropertyElement(null);
        }}
      />
    </>
  );
}

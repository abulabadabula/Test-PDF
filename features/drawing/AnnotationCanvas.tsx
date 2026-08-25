// src/features/drawing/AnnotationCanvas.tsx

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { addShape, selectShapesByPage, selectSelectedShapes, selectShape } from '@/app/store/slices/drawingSlice';
import { ensurePage, selectPageCoordinateSystem, selectOriginMode } from '@/app/store/slices/pageCoordinateSlice';
import type { Shape, TextShape } from '@/app/store/slices/drawingSlice';
import type { StructuralElement } from './elements/elementTypes';
import { renderShape } from './ShapeRenderer';
import { useHitTest } from './hooks/useHitTest';
import { useCanvasEvents } from './hooks/useCanvasEvents';
import { StructuralPropertyDialog } from './StructuralPropertyDialog';
import { setCurrentDrawingScale } from '@/core/coordinate/engineeringScale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

/*
 * AnnotationCanvas is a React component that renders an interactive canvas for
 * drawing annotations on a PDF document. It manages the state of shapes, layers,
 * and user interactions such as selecting, moving, and editing shapes.
 * AnnotationCanvas是一个React组件，用于在PDF文档上渲染交互式画布以进行注释。它管理形状、图层和用户交互的状态，例如选择、移动和编辑形状。
 *
 * The component uses Redux for state management and provides a responsive canvas
 * that adapts to the size of its parent container. It also includes dialogs for
 * adding text annotations and editing properties of structural elements.
 * The component uses Redux for state management and provides a responsive canvas
 * that adapts to the size of its parent container. It also includes dialogs for
 * adding text annotations and editing properties of structural elements.
 * 这个组件使用Redux进行状态管理，并提供一个响应式画布，可以适应其父容器的大小。它还包括用于添加文本注释和编辑结构元素属性的对话框。
 */
export function AnnotationCanvas() {
  const dispatch = useAppDispatch();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const displayScale = useAppSelector((state) => state.pdf.scale);
  const currentPage = useAppSelector((state) => state.pdf.currentPage);
  const layers = useAppSelector((state) => state.layer.layers);
  const activeLayerId = useAppSelector((state) => state.layer.activeLayerId);
  const shapes = useAppSelector((state) => selectShapesByPage(state, currentPage));
  const selectedShapes = useAppSelector(selectSelectedShapes);
  const pageCoordinateSystem = useAppSelector((state) =>
    selectPageCoordinateSystem(state, currentPage)
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

  // 在组件内部添加状态读取
  const showElementLabels = useAppSelector((state) => state.ui.showElementLabels);
  const showElementSections = useAppSelector((state) => state.ui.showElementSections);

  /*
   * Make sure the current page has a
   * coordinate system.
   */
  useEffect(() => {
    dispatch(
      ensurePage({
        pageIndex: currentPage,
      })
    );
  }, [dispatch, currentPage]);

  /*
   * Keep the legacy engineeringScale
   * helper synchronized with the CURRENT PAGE.
   *
   * ShapeRenderer currently uses pageUnitsToMm()
   * for dimension labels.
   */
  useEffect(() => {
    setCurrentDrawingScale(scaleNumerator, scaleDenominator);
  }, [scaleNumerator, scaleDenominator]);

  /*
   * Resize observer.
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;

    if (!parent || typeof ResizeObserver === 'undefined') {
      return;
    }

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

  /*
   * Canvas rendering.
   *
   * IMPORTANT:
   *
   * Only PDF display zoom is used here.
   *
   * Drawing scale is NOT applied.
   */
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

      // 应用全局缩放 (包含设备像素比和用户缩放)
      ctx.setTransform(displayScale * dpr, 0, 0, displayScale * dpr, 0, 0);


      // =========================================================
      // 👇 新增：自适应网格 (Grid) 绘制逻辑
      // =========================================================
      ctx.save();

      // 1. 动态计算网格步长，目标是让屏幕上的网格间距保持在 40px ~ 80px 之间
      const targetScreenStep = 50; 
      let logicalStep = targetScreenStep / displayScale;
      
      // 2. 将步长规整为美观的数字 (如 10, 20, 50, 100, 200...)
      const magnitude = Math.pow(10, Math.floor(Math.log10(logicalStep)));
      const residual = logicalStep / magnitude;
      let niceStep = magnitude;
      if (residual > 5) niceStep = magnitude * 10;
      else if (residual > 2) niceStep = magnitude * 5;
      else if (residual > 1) niceStep = magnitude * 2;

      // 3. 设置网格线样式 (保持屏幕上始终为 1px 细线)
      ctx.strokeStyle = '#e5e7eb'; // Tailwind gray-200 (浅灰色)
      ctx.lineWidth = 1 / (displayScale * dpr); 
      ctx.beginPath();

      // 4. 绘制网格线 (覆盖当前可视区域，并稍微向外扩展一个步长以防平移时出现空白)
      const gridEndX = width + niceStep;
      const gridEndY = height + niceStep;

      for (let x = 0; x <= gridEndX; x += niceStep) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, gridEndY);
      }
      for (let y = 0; y <= gridEndY; y += niceStep) {
        ctx.moveTo(0, y);
        ctx.lineTo(gridEndX, y);
      }
      ctx.stroke();

      // 5. 绘制 X=0 和 Y=0 的主轴线 (稍微加深，作为绝对参考系)
      ctx.strokeStyle = '#9ca3af'; // Tailwind gray-400 (中灰色)
      ctx.lineWidth = 2 / (displayScale * dpr);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(gridEndX, 0); // X 轴
      ctx.moveTo(0, 0);
      ctx.lineTo(0, gridEndY); // Y 轴
      ctx.stroke();

      ctx.restore();
      // =========================================================
      // 👆 网格绘制结束
      // =========================================================



      const visible = new Set(
        layers.filter((layer) => layer.visible).map((layer) => layer.id)
      );

      // 在 useEffect 的渲染循环中，使用两阶段渲染以确保节点 (point) 总是在最上层可见：
      const visibleShapes = shapes.filter((s) => visible.has(s.layerId));

      const nonPointShapes = visibleShapes.filter((s) => s.type !== 'point');
      const pointShapes = visibleShapes.filter((s) => s.type === 'point');

      nonPointShapes.forEach((shape) => {
        renderShape(
          ctx,
          shape,
          selectedShapes.some((selected) => selected.id === shape.id),
          {
            showLabels: showElementLabels,
            showSections: showElementSections,
          }
        );
      });

      // 把点绘制在最后，保证它们不会被梁等线条覆盖
      pointShapes.forEach((shape) => {
        renderShape(
          ctx,
          shape,
          selectedShapes.some((selected) => selected.id === shape.id),
          {
            showLabels: showElementLabels,
            showSections: showElementSections,
          }
        );
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
        ctx.fillRect(
          selectionRect.x,
          selectionRect.y,
          selectionRect.width,
          selectionRect.height
        );
        ctx.strokeRect(
          selectionRect.x,
          selectionRect.y,
          selectionRect.width,
          selectionRect.height
        );
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
          color: '#000000',
          strokeWidth: 1,
          opacity: 1,
          zIndex: 0,
        } as Omit<TextShape, 'id' | 'createdAt' | 'updatedAt'>)
      );
    }

    setTextDialog({ x: 0, y: 0, open: false });
    setTextInput('');
  }, [dispatch, textInput, textDialog.x, textDialog.y, activeLayerId, currentPage]);

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
          if (!open) {
            setPropertyElement(null);
          }
        }}
      />
    </>
  );
}
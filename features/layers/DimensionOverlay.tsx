import { useEffect, useRef, useState } from 'react';
import { useAppSelector } from '@/app/store/hooks';
import { selectShapesByPage } from '@/app/store/slices/drawingSlice';
import { renderDimension } from './DimensionRenderer';

export function DimensionOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const displayScale = useAppSelector((state) => state.pdf.scale);
  const currentPage = useAppSelector((state) => state.pdf.currentPage);
  const shapes = useAppSelector((state) => selectShapesByPage(state, currentPage));
  const showDimensions = useAppSelector((state) => state.layer.showDimensions);
  const layers = useAppSelector((state) => state.layer.layers);
  const scaleNumerator = useAppSelector((state) => state.drawing.scaleNumerator);
  const scaleDenominator = useAppSelector((state) => state.drawing.scaleDenominator);
  const scaleUnit = useAppSelector((state) => state.drawing.scaleUnit);
  const [canvasSizeVersion, setCanvasSizeVersion] = useState(0);

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !showDimensions) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frameId = requestAnimationFrame(() => {
      const dpr = window.devicePixelRatio || 1;
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      if (!cssW || !cssH) return;

      canvas.width = Math.max(1, Math.ceil(cssW * dpr));
      canvas.height = Math.max(1, Math.ceil(cssH * dpr));

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(displayScale * dpr, 0, 0, displayScale * dpr, 0, 0);

      const visibleLayerIds = new Set(
        layers.filter((layer) => layer.visible).map((layer) => layer.id),
      );

      shapes.forEach((shape) => {
        if (visibleLayerIds.has(shape.layerId)) {
          renderDimension(
            ctx,
            shape,
            true,
            scaleNumerator,
            scaleDenominator,
            scaleUnit,
          );
        }
      });
    });

    return () => cancelAnimationFrame(frameId);
  }, [
    shapes,
    displayScale,
    showDimensions,
    layers,
    currentPage,
    scaleNumerator,
    scaleDenominator,
    scaleUnit,
    canvasSizeVersion,
  ]);

  if (!showDimensions) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full z-20 pointer-events-none"
    />
  );
}

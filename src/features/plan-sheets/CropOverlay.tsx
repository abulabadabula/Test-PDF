import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import {
  cancelCrop,
  selectCropMode,
  selectCropSelection,
  setCropSelection,
} from '@/app/store/slices/planSheetSlice';
import { CropDialog } from './CropDialog';
import type { CropRect } from './planSheetTypes';

const MIN_SIZE = 8;

function normalizeRect(
  a: { x: number; y: number },
  b: { x: number; y: number },
  maxWidth: number,
  maxHeight: number,
): CropRect {
  const x1 = Math.max(0, Math.min(a.x, b.x));
  const y1 = Math.max(0, Math.min(a.y, b.y));
  const x2 = Math.max(0, Math.min(maxWidth, Math.max(a.x, b.x)));
  const y2 = Math.max(0, Math.min(maxHeight, Math.max(a.y, b.y)));

  return {
    x: x1,
    y: y1,
    width: Math.max(MIN_SIZE, Math.min(maxWidth - x1, x2 - x1)),
    height: Math.max(MIN_SIZE, Math.min(maxHeight - y1, y2 - y1)),
  };
}

export function CropOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dispatch = useAppDispatch();

  const cropMode = useAppSelector(selectCropMode);
  const selection = useAppSelector(selectCropSelection);
  const displayScale = useAppSelector((state) => state.pdf.scale);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const selectionRef = useRef<CropRect | null>(selection);

  selectionRef.current = selection;

  const pagePoint = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();

      return {
        x: (event.clientX - rect.left) / Math.max(displayScale, 0.0001),
        y: (event.clientY - rect.top) / Math.max(displayScale, 0.0001),
      };
    },
    [displayScale],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.ceil(width * dpr));
    canvas.height = Math.max(1, Math.ceil(height * dpr));

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
    ctx.fillRect(0, 0, width, height);

    const crop = selectionRef.current;
    if (!crop) {
      ctx.fillStyle = 'rgba(37, 99, 235, 0.06)';
      ctx.fillRect(0, 0, width, height);
      return;
    }

    const x = crop.x * displayScale;
    const y = crop.y * displayScale;
    const w = crop.width * displayScale;
    const h = crop.height * displayScale;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillRect(x, y, w, h);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 5]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);

    const handleSize = 8;
    const points = [
      [x, y],
      [x + w, y],
      [x, y + h],
      [x + w, y + h],
      [x + w / 2, y],
      [x + w / 2, y + h],
      [x, y + h / 2],
      [x + w, y + h / 2],
    ];

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 1.5;

    for (const [px, py] of points) {
      ctx.fillRect(px - handleSize / 2, py - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(px - handleSize / 2, py - handleSize / 2, handleSize, handleSize);
    }

    ctx.fillStyle = '#1d4ed8';
    ctx.font = '12px sans-serif';
    ctx.fillText(
      `${Math.round(crop.width)} × ${Math.round(crop.height)} pt`,
      x + 8,
      Math.max(18, y - 8),
    );

    ctx.restore();
  }, [displayScale]);

  useEffect(() => {
    if (!cropMode) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => requestAnimationFrame(draw))
        : null;

    observer?.observe(parent ?? canvas);
    window.addEventListener('resize', draw);
    draw();

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', draw);
    };
  }, [cropMode, draw]);

  useEffect(() => {
    if (cropMode) draw();
  }, [selection, cropMode, draw]);

  useEffect(() => {
    if (!cropMode) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDragStart(null);
        setDialogOpen(false);
        dispatch(cancelCrop());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cropMode, dispatch]);

  if (!cropMode) return null;

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const point = pagePoint(event);
    setDragStart(point);
    canvas.setPointerCapture(event.pointerId);

    dispatch(setCropSelection({
      x: point.x,
      y: point.y,
      width: MIN_SIZE,
      height: MIN_SIZE,
    }));
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragStart) return;

    event.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const maxWidth = canvas.clientWidth / Math.max(displayScale, 0.0001);
    const maxHeight = canvas.clientHeight / Math.max(displayScale, 0.0001);

    dispatch(setCropSelection(
      normalizeRect(
        dragStart,
        pagePoint(event),
        maxWidth,
        maxHeight,
      ),
    ));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragStart) return;

    event.preventDefault();

    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    const maxWidth = (canvas?.clientWidth ?? 0) / Math.max(displayScale, 0.0001);
    const maxHeight = (canvas?.clientHeight ?? 0) / Math.max(displayScale, 0.0001);
    const rect = normalizeRect(
      dragStart,
      pagePoint(event),
      maxWidth,
      maxHeight,
    );

    setDragStart(null);
    dispatch(setCropSelection(rect));

    if (rect.width >= MIN_SIZE && rect.height >= MIN_SIZE) {
      setDialogOpen(true);
    }
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setDragStart(null);
    setDialogOpen(false);
    dispatch(cancelCrop());
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-40 h-full w-full cursor-crosshair"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setDragStart(null)}
        onContextMenu={handleContextMenu}
      />

      <CropDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            dispatch(cancelCrop());
          }
        }}
      />
    </>
  );
}

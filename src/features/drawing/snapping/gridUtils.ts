// src/features/drawing/snapping/gridUtils.ts

export interface GridPoint { x: number; y: number; }
export interface GridOrigin { x: number; y: number; }

export interface GridRenderOptions {
  pageWidth: number;
  pageHeight: number;
  gridSize: number;
  origin: GridOrigin;
  displayScale: number;
  devicePixelRatio: number;
}

/** Snap a page-space point to the nearest grid intersection. */
export function snapPointToGrid(
  point: GridPoint,
  gridSize: number,
  origin: GridOrigin = { x: 0, y: 0 },
): GridPoint {
  const size = Number.isFinite(gridSize) && gridSize > 0 ? gridSize : 0;
  if (!size) return { x: point.x, y: point.y };

  return {
    x: origin.x + Math.round((point.x - origin.x) / size) * size,
    y: origin.y + Math.round((point.y - origin.y) / size) * size,
  };
}

/**
 * Draw the grid in page coordinates. The canvas context has already been
 * transformed by displayScale * devicePixelRatio.
 */
export function drawPageGrid(
  ctx: CanvasRenderingContext2D,
  { pageWidth, pageHeight, gridSize, origin, displayScale, devicePixelRatio }: GridRenderOptions,
): void {
  const size = Number.isFinite(gridSize) && gridSize > 0 ? gridSize : 0;
  if (!size || pageWidth <= 0 || pageHeight <= 0) return;

  const safeScale = Math.max(displayScale, 0.0001);
  const safeDpr = Math.max(devicePixelRatio, 1);

  ctx.save();
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1 / (safeScale * safeDpr);
  ctx.beginPath();

  const firstXIndex = Math.ceil((0 - origin.x) / size);
  const lastXIndex = Math.floor((pageWidth - origin.x) / size);
  const firstYIndex = Math.ceil((0 - origin.y) / size);
  const lastYIndex = Math.floor((pageHeight - origin.y) / size);

  for (let index = firstXIndex; index <= lastXIndex; index += 1) {
    const x = origin.x + index * size;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, pageHeight);
  }

  for (let index = firstYIndex; index <= lastYIndex; index += 1) {
    const y = origin.y + index * size;
    ctx.moveTo(0, y);
    ctx.lineTo(pageWidth, y);
  }

  ctx.stroke();

  const axisXVisible = origin.x >= 0 && origin.x <= pageWidth;
  const axisYVisible = origin.y >= 0 && origin.y <= pageHeight;

  if (axisXVisible || axisYVisible) {
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 2 / (safeScale * safeDpr);
    ctx.beginPath();
    if (axisYVisible) {
      ctx.moveTo(0, origin.y);
      ctx.lineTo(pageWidth, origin.y);
    }
    if (axisXVisible) {
      ctx.moveTo(origin.x, 0);
      ctx.lineTo(origin.x, pageHeight);
    }
    ctx.stroke();
  }

  ctx.restore();
}

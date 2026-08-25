import type { Shape } from '@/app/store/slices/drawingSlice';
import {
  pagePtToEngineeringUnit,
  type EngineeringUnit,
} from '@/core/coordinate/engineeringScale';

export function renderDimension(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  showAutoDims: boolean,
  scaleNumerator = 1,
  scaleDenominator = 100,
  scaleUnit: string = 'mm',
) {
  ctx.save();

  const invScale = 1 / Math.max(ctx.getTransform().a, 0.0001);
  ctx.lineWidth = 1 * invScale;
  ctx.font = `${12 * invScale}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (shape.type === 'measure') {
    const [x1, y1, x2, y2] = shape.points;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const pageLength = Math.sqrt(dx * dx + dy * dy);
    if (pageLength < 1e-6) {
      ctx.restore();
      return;
    }

    const unit = toEngineeringUnit(scaleUnit);
    const realLength = pagePtToEngineeringUnit(
      pageLength,
      scaleNumerator,
      scaleDenominator,
      unit,
    );
    const precision = unit === 'm' ? 3 : unit === 'cm' ? 2 : 1;
    const text = `${realLength.toFixed(precision)} ${unit}`;

    const angle = Math.atan2(dy, dx);
    const perpX = -Math.sin(angle) * 10 * invScale;
    const perpY = Math.cos(angle) * 10 * invScale;
    ctx.strokeStyle = shape.color;

    ctx.beginPath();
    ctx.moveTo(x1 - perpX, y1 - perpY);
    ctx.lineTo(x1 + perpX, y1 + perpY);
    ctx.moveTo(x2 - perpX, y2 - perpY);
    ctx.lineTo(x2 + perpX, y2 + perpY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const headLen = 8 * invScale;
    const drawArrowHead = (x: number, y: number, ang: number) => {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(
        x - headLen * Math.cos(ang - Math.PI / 6),
        y - headLen * Math.sin(ang - Math.PI / 6),
      );
      ctx.moveTo(x, y);
      ctx.lineTo(
        x - headLen * Math.cos(ang + Math.PI / 6),
        y - headLen * Math.sin(ang + Math.PI / 6),
      );
      ctx.stroke();
    };

    drawArrowHead(x1, y1, angle);
    drawArrowHead(x2, y2, angle + Math.PI);

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const metrics = ctx.measureText(text);
    const textW = metrics.width + 8 * invScale;
    const textH = 16 * invScale;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(midX - textW / 2, midY - textH / 2, textW, textH);

    ctx.fillStyle = shape.color;
    ctx.fillText(text, midX, midY);
  } else if (showAutoDims) {
    if (shape.type === 'rectangle') {
      const { x, y, width, height, color } = shape;
      drawAutoDim(
        ctx,
        x,
        y + height + 15 * invScale,
        x + width,
        y + height + 15 * invScale,
        formatPageDimension(width, scaleNumerator, scaleDenominator, scaleUnit),
        invScale,
        color,
      );
      drawAutoDim(
        ctx,
        x - 15 * invScale,
        y,
        x - 15 * invScale,
        y + height,
        formatPageDimension(height, scaleNumerator, scaleDenominator, scaleUnit),
        invScale,
        color,
      );
    } else if (shape.type === 'circle') {
      const { x, y, radius, color } = shape;
      const ang = -Math.PI / 4;
      const ex = x + radius * Math.cos(ang);
      const ey = y + radius * Math.sin(ang);

      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(ex, ey);
      ctx.lineTo(ex + 20 * invScale, ey);
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.fillText(
        `R${formatPageDimension(radius, scaleNumerator, scaleDenominator, scaleUnit)}`,
        ex + 22 * invScale,
        ey,
      );
    }
  }

  ctx.restore();
}

function toEngineeringUnit(value: string): EngineeringUnit {
  return value === 'm' || value === 'cm' || value === 'mm' ? value : 'mm';
}

function formatPageDimension(
  pagePt: number,
  numerator: number,
  denominator: number,
  scaleUnit: string,
): string {
  const unit = toEngineeringUnit(scaleUnit);
  const value = pagePtToEngineeringUnit(pagePt, numerator, denominator, unit);
  const digits = unit === 'm' ? 3 : unit === 'cm' ? 2 : 1;
  return `${value.toFixed(digits)} ${unit}`;
}

function drawAutoDim(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  text: string,
  invScale: number,
  color: string,
) {
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const metrics = ctx.measureText(text);
  const textW = metrics.width + 4 * invScale;
  const textH = 12 * invScale;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillRect(midX - textW / 2, midY - textH / 2, textW, textH);

  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, midX, midY);
}

import type { Shape } from '@/app/store/slices/drawingSlice';
import type { StructuralElement } from './elements/elementTypes';
import { ELEMENT_COLORS, pageUnitsToMm } from './elements/elementDefaults';
import { elementBounds } from './geometry/geometryUtils';
import { getInsetPolygon } from './geometry/geometryUtils';

// --- 新增：渲染配置选项接口 ---
export interface RenderOptions {
  showLabels?: boolean;
  showSections?: boolean;
}

function drawSelection(
  ctx: CanvasRenderingContext2D,
  e: StructuralElement,
) {
  ctx.save();

  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 4]);

  switch (e.type) {
    case 'node': {
        const { x, y } = e.geometry;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2; 
        ctx.setLineDash([]); 
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2); // 选中时半径比正常稍大一点
        ctx.stroke();
        break;
    }

    case 'beam': {
      const { start, end } = e.geometry;
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const len = Math.hypot(dx, dy);
      const offset = 5; // A few pixels offset from the line

      if (len < 1e-6) {
        ctx.strokeRect(start.x - offset, start.y - offset, offset * 2, offset * 2);
      } else {
        // Normal vector perpendicular to beam
        const nx = (-dy / len) * offset;
        const ny = (dx / len) * offset;
        // Tangent extension vector along beam
        const tx = (dx / len) * offset;
        const ty = (dy / len) * offset;

        // Oriented bounding box tightly enclosing the inclined beam
        ctx.beginPath();
        ctx.moveTo(start.x - tx + nx, start.y - ty + ny);
        ctx.lineTo(end.x + tx + nx, end.y + ty + ny);
        ctx.lineTo(end.x + tx - nx, end.y + ty - ny);
        ctx.lineTo(start.x - tx - nx, start.y - ty - ny);
        ctx.closePath();
        ctx.stroke();
      }
      break;
    }

    case 'wall': {
      const { start, end, thickness } = e.geometry;
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const len = Math.hypot(dx, dy);
      const offset = (thickness || 1) / 2 + 5;
      const ext = 5;

      if (len < 1e-6) {
        ctx.strokeRect(start.x - offset, start.y - offset, offset * 2, offset * 2);
      } else {
        const nx = (-dy / len) * offset;
        const ny = (dx / len) * offset;
        const tx = (dx / len) * ext;
        const ty = (dy / len) * ext;

        ctx.beginPath();
        ctx.moveTo(start.x - tx + nx, start.y - ty + ny);
        ctx.lineTo(end.x + tx + nx, end.y + ty + ny);
        ctx.lineTo(end.x + tx - nx, end.y + ty - ny);
        ctx.lineTo(start.x - tx - nx, start.y - ty - ny);
        ctx.closePath();
        ctx.stroke();
      }
      break;
    }

    case 'column': {
      const g = e.geometry;
      const cx = g.x + g.width / 2;
      const cy = g.y + g.depth / 2;
      const hw = g.width / 2 + 5;
      const hd = g.depth / 2 + 5;

      ctx.translate(cx, cy);
      ctx.rotate((g.rotation * Math.PI) / 180);
      ctx.strokeRect(-hw, -hd, hw * 2, hd * 2);
      break;
    }

    case 'slab': {
      // ✅ 新增：板被选中时，显示向内 offset 的虚线轮廓
      // const pts = e.geometry.points;
      // if (pts.length >= 3) {
      //   // 1. 计算多边形质心
      //   let cx = 0, cy = 0;
      //   for (const p of pts) {
      //     cx += p.x;
      //     cy += p.y;
      //   }
      //   cx /= pts.length;
      //   cy /= pts.length;

      //   // 2. 将每个顶点向质心方向收缩固定像素 (例如 6px)
      //   const offset = 6;
      //   const innerPts = pts.map(p => {
      //     const dx = cx - p.x;
      //     const dy = cy - p.y;
      //     const dist = Math.hypot(dx, dy);
      //     if (dist === 0) return p;
      //     const move = Math.min(offset, dist * 0.5); // 防止极小图形过度收缩
      //     const factor = (dist - move) / dist;
      //     return {
      //       x: cx + dx * factor,
      //       y: cy + dy * factor
      //     };
      //   });

      //   // 3. 绘制向内收缩的虚线
      //   ctx.beginPath();
      //   ctx.moveTo(innerPts[0].x, innerPts[0].y);
      //   for (let i = 1; i < innerPts.length; i++) {
      //     ctx.lineTo(innerPts[i].x, innerPts[i].y);
      //   }
      //   ctx.closePath();
      //   ctx.stroke();
      // }
      // break;
      const pts = e.geometry.points;
      if (pts.length >= 3) {
        // ✅ 核心修改：计算向内偏移 4px 的新多边形路径
        const insetPts = getInsetPolygon(pts, 4); 
        
        ctx.beginPath();
        ctx.moveTo(insetPts[0].x, insetPts[0].y);
        for (let i = 1; i < insetPts.length; i++) {
          ctx.lineTo(insetPts[i].x, insetPts[i].y);
        }
        ctx.closePath();
        
        // 绘制向内收缩的虚线选择框
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 1.5; // 可以稍微加粗一点以增强可见性
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        
        // 可选：在顶点处绘制小方块控制点，提升专业 CAD 体验
        ctx.setLineDash([]);
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 1;
        for (const p of insetPts) {
          ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
          ctx.strokeRect(p.x - 3, p.y - 3, 6, 6);
        }
      }
      break;
    }

    case 'portalFrame': {
      const b = elementBounds(e);
      ctx.strokeRect(
        b.minX - 5,
        b.minY - 5,
        b.maxX - b.minX + 10,
        b.maxY - b.minY + 10,
      );
      break;
    }
  }

  ctx.restore();
}

/**
 * Draw a small centre point / centre mark.
 *
 * The size is kept visually constant on the PDF page,
 * rather than becoming excessively large for small structural
 * members such as 90 x 90 columns.
 */
function drawCenterMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size = 2.5,
) {
  ctx.save();

  ctx.fillStyle = '#111827';

  ctx.beginPath();
  ctx.arc(x, y, Math.max(size * 0.45, 0.8), 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 0.6;

  ctx.beginPath();
  ctx.moveTo(x - size, y);
  ctx.lineTo(x + size, y);

  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y + size);

  ctx.stroke();

  ctx.restore();
}

/**
 * Draw a simple horizontal dimension.
 *
 * This is intentionally a compact drawing annotation rather than
 * the full Measure tool.
 */
function drawHorizontalDimension(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  y: number,
  realLength: number,
) {
  const length = Math.abs(x2 - x1);

  if (length < 0.5) {
    return;
  }

  ctx.save();

  ctx.strokeStyle = '#111827';
  ctx.fillStyle = '#111827';
  ctx.lineWidth = 0.65;
  ctx.setLineDash([]);

  // Extension lines
  ctx.beginPath();

  ctx.moveTo(x1, y + 1);
  ctx.lineTo(x1, y - 3);

  ctx.moveTo(x2, y + 1);
  ctx.lineTo(x2, y - 3);

  // Dimension line
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);

  ctx.stroke();

  // Arrow heads
  const arrow = Math.min(2.5, Math.max(1.2, length * 0.12));

  ctx.beginPath();

  ctx.moveTo(x1, y);
  ctx.lineTo(x1 + arrow, y - arrow * 0.55);

  ctx.moveTo(x1, y);
  ctx.lineTo(x1 + arrow, y + arrow * 0.55);

  ctx.moveTo(x2, y);
  ctx.lineTo(x2 - arrow, y - arrow * 0.55);

  ctx.moveTo(x2, y);
  ctx.lineTo(x2 - arrow, y + arrow * 0.55);

  ctx.stroke();

  // Text
  ctx.font = '8px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  ctx.fillText(
    `${Math.round(realLength)}`,
    (x1 + x2) / 2,
    y - 1.5,
  );

  ctx.restore();
}

/**
 * Draw a simple vertical dimension.
 */
function drawVerticalDimension(
  ctx: CanvasRenderingContext2D,
  x: number,
  y1: number,
  y2: number,
  realLength: number,
) {
  const length = Math.abs(y2 - y1);

  if (length < 0.5) {
    return;
  }

  ctx.save();

  ctx.strokeStyle = '#111827';
  ctx.fillStyle = '#111827';
  ctx.lineWidth = 0.65;
  ctx.setLineDash([]);

  ctx.beginPath();

  // Extension lines
  ctx.moveTo(x + 1, y1);
  ctx.lineTo(x + 4, y1);

  ctx.moveTo(x + 1, y2);
  ctx.lineTo(x + 4, y2);

  // Dimension line
  ctx.moveTo(x + 3, y1);
  ctx.lineTo(x + 3, y2);

  ctx.stroke();

  const arrow = Math.min(2.5, Math.max(1.2, length * 0.12));

  ctx.beginPath();

  ctx.moveTo(x + 3, y1);
  ctx.lineTo(x + 3 - arrow * 0.55, y1 + arrow);

  ctx.moveTo(x + 3, y1);
  ctx.lineTo(x + 3 + arrow * 0.55, y1 + arrow);

  ctx.moveTo(x + 3, y2);
  ctx.lineTo(x + 3 - arrow * 0.55, y2 - arrow);

  ctx.moveTo(x + 3, y2);
  ctx.lineTo(x + 3 + arrow * 0.55, y2 - arrow);

  ctx.stroke();

  // Rotated dimension text
  ctx.translate(x + 8, (y1 + y2) / 2);
  ctx.rotate(-Math.PI / 2);

  ctx.font = '8px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  ctx.fillText(
    `${Math.round(realLength)}`,
    0,
    0,
  );

  ctx.restore();
}

function drawNode(
    ctx: CanvasRenderingContext2D,
    e: Extract<StructuralElement, { type: 'node' }>,
    options?: RenderOptions,
) {
    const { x, y } = e.geometry;
    // 设置节点半径为 6，确保比 beam 的线宽大，足够显眼
    const nodeRadius = 6; 

    ctx.save();
    
    // 1. 绘制醒目的红色实心圆
    ctx.fillStyle = '#ef4444'; // 亮红色
    ctx.beginPath();
    ctx.arc(x, y, nodeRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // 2. 添加白色描边，确保在深色背景或重叠线条上依然清晰可见
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // 3. 如果启用了标签显示，且有 label (如 "N-001")，则绘制标签
    if (options?.showLabels && e.label) {
        ctx.fillStyle = '#2563eb'; // 蓝色标签
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(e.label, x + nodeRadius + 3, y - nodeRadius);
    }
    
    ctx.restore();
}

function drawColumn(
  ctx: CanvasRenderingContext2D,
  e: Extract<StructuralElement, { type: 'column' }>,
  options?: RenderOptions,
) {
  const g = e.geometry;
  const centerX = g.x + g.width / 2;
  const centerY = g.y + g.depth / 2;

  ctx.save();
  ctx.globalAlpha = e.style.opacity;
  ctx.strokeStyle = ELEMENT_COLORS.column;
  ctx.lineWidth = Math.max(0.75, e.style.strokeWidth);
  ctx.lineJoin = 'miter';

  ctx.translate(centerX, centerY);
  ctx.rotate((g.rotation * Math.PI) / 180);
  ctx.translate(-centerX, -centerY);

  if (e.style.fillColor && e.style.fillColor !== 'transparent') {
    ctx.fillStyle = e.style.fillColor;
    ctx.globalAlpha = e.style.fillOpacity ?? e.style.opacity;
    ctx.fillRect(g.x, g.y, g.width, g.depth);
    ctx.globalAlpha = e.style.opacity;
  }

  ctx.strokeRect(g.x, g.y, g.width, g.depth);
  drawCenterMark(ctx, centerX, centerY, Math.max(2.5, Math.min(g.width, g.depth) * 0.8));

  const realWidth = pageUnitsToMm(g.width);
  const realDepth = pageUnitsToMm(g.depth);

  drawHorizontalDimension(ctx, g.x, g.x + g.width, g.y - 6, realWidth);
  drawVerticalDimension(ctx, g.x + g.width + 4, g.y, g.y + g.depth, realDepth);

  // --- 新增：绘制柱编号 ---
  if (options?.showLabels && e.label) {
    ctx.fillStyle = '#2563eb';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(e.label, centerX, centerY);
  }

  ctx.restore();
}

function drawBeam(
  ctx: CanvasRenderingContext2D,
  e: Extract<StructuralElement, { type: 'beam' }>,
  options?: RenderOptions,
) {
  const g = e.geometry;
  ctx.save();
  ctx.globalAlpha = e.style.opacity;
  ctx.strokeStyle = ELEMENT_COLORS.beam;
  ctx.lineWidth = Math.max(1.0, e.style.strokeWidth);
  ctx.lineCap = 'butt';

  ctx.beginPath();
  ctx.moveTo(g.start.x, g.start.y);
  ctx.lineTo(g.end.x, g.end.y);
  ctx.stroke();

  // --- 绘制梁的标签与截面信息 ---
  // "Show Element Labels" 控制元素的编号/标签显示（优先显示自定义标签），
  // "Show Element Sections" 控制基于尺寸的截面信息显示（当没有自定义标签或用户只想看尺寸时）。
  {
    const midX = (g.start.x + g.end.x) / 2;
    const midY = (g.start.y + g.end.y) / 2;
    ctx.fillStyle = '#111827';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    if (options?.showLabels && e.label) {
      // 显示用户自定义的标签，使用强调颜色
      ctx.fillStyle = '#2563eb';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(e.label, midX, midY - 4);
    } else if (options?.showSections) {
      // 显示截面尺寸信息（基于宽度/深度）
      const sectionText = `B ${Math.round(pageUnitsToMm(g.width || 0))}x${Math.round(pageUnitsToMm(g.depth || 0))}`;
      ctx.fillStyle = '#111827';
      ctx.font = '9px sans-serif';
      ctx.fillText(sectionText, midX, midY - 4);
    }
  }

  ctx.restore();
}

function drawWall(
  ctx: CanvasRenderingContext2D,
  e: Extract<StructuralElement, { type: 'wall' }>,
  options?: RenderOptions,
) {
  const g = e.geometry;
  const angle = Math.atan2(g.end.y - g.start.y, g.end.x - g.start.x);
  const nx = Math.sin(angle) * (g.thickness / 2);
  const ny = -Math.cos(angle) * (g.thickness / 2);

  ctx.save();
  ctx.globalAlpha = e.style.opacity;
  ctx.strokeStyle = ELEMENT_COLORS.wall;
  ctx.lineWidth = Math.max(0.8, e.style.strokeWidth);
  ctx.lineJoin = 'miter';

  ctx.beginPath();
  ctx.moveTo(g.start.x + nx, g.start.y + ny);
  ctx.lineTo(g.end.x + nx, g.end.y + ny);
  ctx.lineTo(g.end.x - nx, g.end.y - ny);
  ctx.lineTo(g.start.x - nx, g.start.y - ny);
  ctx.closePath();

  if (e.style.fillColor && e.style.fillColor !== 'transparent') {
    ctx.fillStyle = e.style.fillColor;
    ctx.globalAlpha = e.style.fillOpacity ?? e.style.opacity;
    ctx.fill();
    ctx.globalAlpha = e.style.opacity;
  }
  ctx.stroke();

  ctx.strokeStyle = ELEMENT_COLORS.wallCenterline;
  ctx.lineWidth = 0.65;
  ctx.setLineDash([3, 2]);
  ctx.beginPath();
  ctx.moveTo(g.start.x, g.start.y);
  ctx.lineTo(g.end.x, g.end.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // --- 新增：绘制墙截面信息 ---
  if (options?.showSections) {
    const midX = (g.start.x + g.end.x) / 2;
    const midY = (g.start.y + g.end.y) / 2;
    ctx.fillStyle = '#111827';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const sectionText = e.label || `W ${Math.round(pageUnitsToMm(g.thickness || 0))}`;
    ctx.fillText(sectionText, midX, midY - 4);
  }

  ctx.restore();
}

// function drawSlab(
//   ctx: CanvasRenderingContext2D,
//   e: Extract<StructuralElement, { type: 'slab' }>,
//   options?: RenderOptions,
// ) {
//   const pts = e.geometry.points;

//   if (!pts.length) {
//     return;
//   }

//   ctx.save();

//   ctx.globalAlpha = e.style.opacity;
//   ctx.strokeStyle = e.style.color;
//   ctx.lineWidth = e.style.strokeWidth;

//   ctx.beginPath();

//   ctx.moveTo(
//     pts[0].x,
//     pts[0].y,
//   );

//   pts.slice(1).forEach((p) => {
//     ctx.lineTo(p.x, p.y);
//   });

//   ctx.closePath();

//   if (
//     e.style.fillColor &&
//     e.style.fillColor !== 'transparent'
//   ) {
//     ctx.fillStyle = e.style.fillColor;

//     ctx.globalAlpha =
//       e.style.fillOpacity ?? e.style.opacity;

//     ctx.fill();

//     ctx.globalAlpha = e.style.opacity;
//   }

//   ctx.stroke();

//   ctx.restore();
// }

function drawSlab(
ctx: CanvasRenderingContext2D, e: Extract<StructuralElement, { type: 'slab'; }>, options: RenderOptions | undefined,
) {
  const pts = e.geometry.points;
  if (!pts.length) return;

  ctx.save();
  ctx.globalAlpha = e.style.opacity;
  
  // ✅ 兜底使用专属颜色，防止旧数据无颜色
  ctx.strokeStyle = e.style.color || ELEMENT_COLORS.slab;
  ctx.lineWidth = e.style.strokeWidth;

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  pts.slice(1).forEach((p) => {
    ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();

  // ✅ 确保带有透明度的填充
  const fillColor = e.style.fillColor || ELEMENT_COLORS.slab;
  if (fillColor && fillColor !== 'transparent') {
    ctx.fillStyle = fillColor;
    ctx.globalAlpha = e.style.fillOpacity ?? 0.15;
    ctx.fill();
    ctx.globalAlpha = e.style.opacity; // 恢复边框透明度
  }

  ctx.stroke();
  ctx.restore();
}

function drawPortalFrame(
  ctx: CanvasRenderingContext2D,
  e: Extract<StructuralElement, { type: 'portalFrame' }>,
  options?: RenderOptions,
) {
  const g = e.geometry;

  /**
   * In plan view the portal frame is represented as:
   *
   *   [COLUMN] ───────── [COLUMN]
   *
   * The two columns use the normal column representation.
   * The connecting member uses a separate colour.
   *
   * We deliberately do NOT draw the old vertical "elevation"
   * representation here because this canvas represents an
   * architectural floor plan.
   */

  ctx.save();

  ctx.globalAlpha = e.style.opacity;

  const columnWidth = g.columnWidth;
  const columnDepth = g.columnDepth;

  /**
   * Draw one column centred at a point.
   */
  const drawPortalColumn = (
    x: number,
    y: number,
  ) => {
    const left = x - columnWidth / 2;
    const top = y - columnDepth / 2;

    ctx.strokeStyle = ELEMENT_COLORS.portalColumn;

    ctx.lineWidth = Math.max(
      0.75,
      e.style.strokeWidth,
    );

    ctx.lineJoin = 'miter';

    if (
      e.style.fillColor &&
      e.style.fillColor !== 'transparent'
    ) {
      ctx.fillStyle = e.style.fillColor;

      ctx.globalAlpha =
        e.style.fillOpacity ?? e.style.opacity;

      ctx.fillRect(
        left,
        top,
        columnWidth,
        columnDepth,
      );

      ctx.globalAlpha = e.style.opacity;
    }

    ctx.strokeRect(
      left,
      top,
      columnWidth,
      columnDepth,
    );

    drawCenterMark(
      ctx,
      x,
      y,
      Math.max(
        2.5,
        Math.min(columnWidth, columnDepth) * 0.8,
      ),
    );
  };

  drawPortalColumn(
    g.start.x,
    g.start.y,
  );

  drawPortalColumn(
    g.end.x,
    g.end.y,
  );

  /**
   * Portal connecting beam.
   *
   * Deliberately different colour from the columns.
   */
  ctx.strokeStyle = ELEMENT_COLORS.portalBeam;

  ctx.lineWidth = Math.max(
    1.0,
    e.style.strokeWidth,
  );

  ctx.lineCap = 'butt';

  ctx.beginPath();

  ctx.moveTo(
    g.start.x,
    g.start.y,
  );

  ctx.lineTo(
    g.end.x,
    g.end.y,
  );

  ctx.stroke();

  ctx.restore();
}

function drawStructural(
  ctx: CanvasRenderingContext2D,
  e: StructuralElement,
  selected: boolean,
  options?: RenderOptions,
) {
  switch (e.type) {
    case 'node':
      drawNode(ctx, e, options);
      break;
    case 'column':
      drawColumn(ctx, e, options);
      break;
    case 'beam':
      drawBeam(ctx, e, options);
      break;
    case 'wall':
      drawWall(ctx, e, options);
      break;
    case 'slab':
      drawSlab(ctx, e, options);
      break;
    case 'portalFrame':
      drawPortalFrame(ctx, e, options);
      break;
  }

  if (selected) {
    drawSelection(ctx, e);
  }
}

export function renderShape(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  isSelected: boolean,
  options?: RenderOptions,
) {
  if ('geometry' in shape && 'style' in shape) {
    drawStructural(ctx, shape as StructuralElement, isSelected, options);
    return;
  }

  ctx.save();
  ctx.globalAlpha = shape.opacity;
  ctx.strokeStyle = shape.color;
  ctx.lineWidth = shape.strokeWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  switch (shape.type) {
    case 'point': {
      // --- 节点显示：明确使用红点并保持可配置半径 ---
      const pointRadius = Math.max(typeof shape.radius === 'number' ? shape.radius : 6, 6); // 默认半径为 6 保持可见

      // 先绘制白色底圈作为描边/背景以保证在任何线条之上都能看清（半径略大）
      ctx.beginPath();
      ctx.fillStyle = '#ffffff';
      ctx.arc(shape.x, shape.y, pointRadius + 1.25, 0, Math.PI * 2);
      ctx.fill();

      // 绘制红色实心点
      ctx.beginPath();
      ctx.fillStyle = '#ef4444'; // 固定显眼的红色
      ctx.arc(shape.x, shape.y, pointRadius, 0, Math.PI * 2);
      ctx.fill();

      // 细描边增强可读性
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, pointRadius * 0.25);
      ctx.stroke();

      // 如果启用了标签显示，且有 label，则绘制标签
      if (options?.showLabels && shape.label) {
        ctx.fillStyle = '#2563eb';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(shape.label, shape.x + pointRadius + 3, shape.y - pointRadius);
      }
      break;
    }

    case 'line':
      ctx.beginPath();

      ctx.moveTo(
        shape.points[0],
        shape.points[1],
      );

      ctx.lineTo(
        shape.points[2],
        shape.points[3],
      );

      ctx.stroke();
      break;

    case 'polyline':
      ctx.beginPath();

      ctx.moveTo(
        shape.points[0],
        shape.points[1],
      );

      for (
        let i = 2;
        i < shape.points.length;
        i += 2
      ) {
        ctx.lineTo(
          shape.points[i],
          shape.points[i + 1],
        );
      }

      ctx.stroke();
      break;

    case 'polygon':
      ctx.beginPath();

      ctx.moveTo(
        shape.points[0],
        shape.points[1],
      );

      for (
        let i = 2;
        i < shape.points.length;
        i += 2
      ) {
        ctx.lineTo(
          shape.points[i],
          shape.points[i + 1],
        );
      }

      ctx.closePath();

      if (
        shape.fillColor &&
        shape.fillColor !== 'transparent'
      ) {
        ctx.fillStyle = shape.fillColor;
        ctx.fill();
      }

      ctx.stroke();
      break;

    case 'rectangle':
      ctx.strokeRect(
        shape.x,
        shape.y,
        shape.width,
        shape.height,
      );
      break;

    case 'circle':
      ctx.beginPath();

      ctx.arc(
        shape.x,
        shape.y,
        shape.radius,
        0,
        Math.PI * 2,
      );

      ctx.stroke();
      break;

    case 'text':
      ctx.fillStyle = shape.color;
      ctx.font = `${shape.fontSize}px ${shape.fontFamily}`;
      ctx.textBaseline = 'top';

      ctx.fillText(
        shape.text,
        shape.x,
        shape.y,
      );
      break;

    case 'measure': {
      const [
        x1,
        y1,
        x2,
        y2,
      ] = shape.points;

      ctx.beginPath();

      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);

      ctx.stroke();

      ctx.font = '12px sans-serif';

      ctx.fillText(
        `${shape.realLength} ${shape.unit}`,
        (x1 + x2) / 2,
        (y1 + y2) / 2,
      );

      break;
    }
  }

  /**
   * Selection box for legacy shapes.
   */
  if (
    isSelected &&
    !('geometry' in shape)
  ) {
    ctx.save();

    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);

    if (shape.type === 'line' || shape.type === 'measure') {
      const [x1, y1, x2, y2] = shape.points;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      const offset = 5;

      if (len < 1e-6) {
        ctx.strokeRect(x1 - offset, y1 - offset, offset * 2, offset * 2);
      } else {
        const nx = (-dy / len) * offset;
        const ny = (dx / len) * offset;
        const tx = (dx / len) * offset;
        const ty = (dy / len) * offset;

        ctx.beginPath();
        ctx.moveTo(x1 - tx + nx, y1 - ty + ny);
        ctx.lineTo(x2 + tx + nx, y2 + ty + ny);
        ctx.lineTo(x2 + tx - nx, y2 + ty - ny);
        ctx.lineTo(x1 - tx - nx, y1 - ty - ny);
        ctx.closePath();
        ctx.stroke();
      }
    } else if (shape.type === 'circle') {
      ctx.beginPath();
      ctx.arc(shape.x, shape.y, shape.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
    } else if (shape.type === 'polygon' && shape.points.length >= 4) {
      ctx.beginPath();
      ctx.moveTo(shape.points[0], shape.points[1]);
      for (let i = 2; i < shape.points.length; i += 2) {
        ctx.lineTo(shape.points[i], shape.points[i + 1]);
      }
      ctx.closePath();
      ctx.stroke();
    } else {
      let bounds: {
        x: number;
        y: number;
        w: number;
        h: number;
      };

      if (
        'x' in shape &&
        'width' in shape
      ) {
        bounds = {
          x: shape.x,
          y: shape.y,
          w: shape.width,
          h: shape.height,
        };
      } else if ('points' in shape) {
        const xs = shape.points.filter(
          (_, i) => i % 2 === 0,
        );

        const ys = shape.points.filter(
          (_, i) => i % 2 === 1,
        );

        bounds = {
          x: Math.min(...xs),
          y: Math.min(...ys),
          w: Math.max(...xs) - Math.min(...xs),
          h: Math.max(...ys) - Math.min(...ys),
        };
      } else {
        bounds = {
          x: shape.x - 5,
          y: shape.y - 5,
          w: 10,
          h: 10,
        };
      }

      ctx.strokeRect(
        bounds.x - 5,
        bounds.y - 5,
        bounds.w + 10,
        bounds.h + 10,
      );
    }

    ctx.restore();
  }

  ctx.restore();
}
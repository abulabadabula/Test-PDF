// import { BaseTool, CanvasEvent, ToolContext } from './BaseTool';
// import { getStructuralDefaults, ELEMENT_COLORS } from '../elements/elementDefaults';
// import { makeBase, ensureLabel } from './structuralToolUtils';

// export class SlabTool extends BaseTool {
//   cursor = 'crosshair';

//   onMouseDown(e: CanvasEvent, ctx: ToolContext) {
//     const drawing = ctx.getState().drawing;
//     const d = getStructuralDefaults(drawing.scaleDenominator, drawing.scaleNumerator).slab;
//     const label = ensureLabel(ctx, 'slab');

//     // ✅ 强制设定板的样式：专属颜色 + 带透明度的填充
//     const slabStyle = {
//       color: ELEMENT_COLORS.slab,
//       strokeWidth: 1.5,
//       opacity: 1,
//       fillColor: ELEMENT_COLORS.slab,
//       fillOpacity: 0.15, 
//     };

//     if (!ctx.tempShape) {
//       ctx.setTempShape({
//         ...makeBase(ctx, 'slab', { points: [e] }),
//         label,
//         properties: {
//           label,
//           thickness: d.realThickness,
//           material: d.material,
//           level: d.level,
//         },
//       } as any);
//     } else {
//       const pts = [...(ctx.tempShape as any).geometry.points];
//       pts[pts.length - 1] = e;
//       pts.push(e);
//       ctx.setTempShape({ ...ctx.tempShape, geometry: { points: pts } } as any);
//     }
//   }

//   onMouseMove(e: CanvasEvent, ctx: ToolContext) {
//     if (ctx.tempShape) {
//       const pts = [...(ctx.tempShape as any).geometry.points];
//       if (pts.length) pts[pts.length - 1] = e;
//       ctx.setTempShape({ ...ctx.tempShape, geometry: { points: pts } } as any);
//     }
//   }

//   onMouseUp() {}

//   onDblClick(_: CanvasEvent, ctx: ToolContext) {
//     const shape: any = ctx.tempShape;
//     if (!shape) return;
//     const pts = shape.geometry.points.slice(0, -1);
//     if (pts.length >= 3) {
//       ctx.addShape({ 
//         ...shape, 
//         geometry: { points: pts },
//         // ✅ 确保最终落地的板也保留透明填充和专属颜色
//         style: shape.style || {
//           color: ELEMENT_COLORS.slab,
//           strokeWidth: 1.5,
//           opacity: 1,
//           fillColor: ELEMENT_COLORS.slab,
//           fillOpacity: 0.15,
//         }
//       } as any);
//     }
//     ctx.setTempShape(null);
//   }

//   onKeyDown(e: KeyboardEvent, ctx: ToolContext) {
//     if (e.key === 'Enter') this.onDblClick({ x: 0, y: 0, rawEvent: e as any }, ctx);
//     if (e.key === 'Escape') ctx.setTempShape(null);
//   }
// }


import { BaseTool, CanvasEvent, ToolContext } from './BaseTool';
import { getStructuralDefaults, ELEMENT_COLORS } from '../elements/elementDefaults';
import { makeBase, ensureLabel } from './structuralToolUtils';

export class SlabTool extends BaseTool {
  cursor = 'crosshair';

  onMouseDown(e: CanvasEvent, ctx: ToolContext) {
    const drawing = ctx.getState().drawing;
    const d = getStructuralDefaults(drawing.scaleDenominator, drawing.scaleNumerator).slab;
    const label = ensureLabel(ctx, 'slab');

    // 强制设定板的样式：专属颜色 + 带透明度的填充
    const slabStyle = {
      color: ELEMENT_COLORS.slab,
      strokeWidth: 1.5,
      opacity: 1,
      fillColor: ELEMENT_COLORS.slab,
      fillOpacity: 0.15, 
    };

    // ✅ 修复：只存储纯坐标对象 { x, y }，而不是包含 rawEvent 的完整 CanvasEvent
    const point = { x: e.x, y: e.y };

    if (!ctx.tempShape) {
      ctx.setTempShape({
        ...makeBase(ctx, 'slab', { points: [point, point] }),
        label,
        style: slabStyle,
        properties: {
          label,
          thickness: d.realThickness,
          material: d.material,
          level: d.level,
        },
      } as any);
    } else {
      const pts = [...(ctx.tempShape as any).geometry.points];
      // pts[pts.length - 1] = point;
      pts.push(point);
      ctx.setTempShape({ ...ctx.tempShape, geometry: { points: pts } } as any);
    }
  }

  onMouseMove(e: CanvasEvent, ctx: ToolContext) {
    if (ctx.tempShape) {
      const pts = [...(ctx.tempShape as any).geometry.points];
      if (pts.length > 0) {
        // ✅ 修复：只更新纯坐标对象
        pts[pts.length - 1] = { x: e.x, y: e.y };
      }
      ctx.setTempShape({ ...ctx.tempShape, geometry: { points: pts } } as any);
    }
  }


  onDblClick(_: CanvasEvent, ctx: ToolContext) {
    const shape: any = ctx.tempShape;
    if (!shape) return;
    
    // ✅  截取时去掉最后一个多余的“动态点”
    const pts = shape.geometry.points.slice(0, -1).map((p: any) => ({ x: p.x, y: p.y }));
    
    if (pts.length >= 3) {
      ctx.addShape({ 
        ...shape, 
        geometry: { points: pts },
        // 确保最终落地的板也保留透明填充和专属颜色
        style: shape.style || {
          color: ELEMENT_COLORS.slab,
          strokeWidth: 1.5,
          opacity: 1,
          fillColor: ELEMENT_COLORS.slab,
          fillOpacity: 0.15,
        }
      } as any);
    }
    ctx.setTempShape(null);
  }

  onMouseUp() {}

  onKeyDown(e: KeyboardEvent, ctx: ToolContext) {
    if (e.key === 'Enter') this.onDblClick({ x: 0, y: 0, rawEvent: e as any }, ctx);
    if (e.key === 'Escape') ctx.setTempShape(null);
  }
}
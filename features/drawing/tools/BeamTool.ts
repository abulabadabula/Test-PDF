import { BaseTool, CanvasEvent, ToolContext } from './BaseTool';
import { makeBase, ensureLabel, getOrCreateNode } from './structuralToolUtils';
import { getStructuralDefaults } from '../elements/elementDefaults';
import { nanoid } from '@reduxjs/toolkit';
import { setActiveTool } from '@/app/store/slices/drawingSlice';

export class BeamTool extends BaseTool {
  cursor = 'crosshair';
  private isDrawing = false;
  private lastPoint: { x: number; y: number } | null = null;
  private lastNodeId: string | null = null;

private start: { x: number; y: number } | null = null;

  onMouseDown(e: CanvasEvent, ctx: ToolContext) {
    const rawEvent = e.rawEvent as MouseEvent;

    // 右键点击：取消绘制状态
    if (rawEvent.button === 2) {
      this.reset();
      ctx.setTempShape(null);
      return;
    }

    // 左键点击：确定节点并处理绘制逻辑
    if (rawEvent.button === 0) {
      const snapResult = getOrCreateNode(ctx, { x: e.x, y: e.y }, 5);

      // 如果是新生成的节点，立即添加到画布
      if (snapResult.isNew && snapResult.shape) {
        ctx.addShape(snapResult.shape);
      }

      if (!this.isDrawing) {
        // 第一次点击：开始绘制
        this.isDrawing = true;
        this.lastPoint = snapResult.snappedPoint;
        this.lastNodeId = snapResult.id;
        this.createTempShape(ctx, this.lastPoint, this.lastNodeId);
      } else {
        // 后续点击：确定当前线段，并准备下一段
        const endPoint = snapResult.snappedPoint;
        const endNodeId = snapResult.id;

        // 固化当前的梁元素
        this.finalizeShape(ctx, this.lastPoint!, endPoint, this.lastNodeId!, endNodeId);

        // 更新状态，将当前终点作为下一段的起点
        this.lastPoint = endPoint;
        this.lastNodeId = endNodeId;

        // 重置临时预览线，起点和终点重合，等待下一次 mouseMove
        this.createTempShape(ctx, this.lastPoint, this.lastNodeId);
      }
    }
  }

  onMouseMove(e: CanvasEvent, ctx: ToolContext) {
    if (this.isDrawing && ctx.tempShape) {
      // 动态检测鼠标位置是否吸附到现有节点，以提供预览线吸附效果
      const snapResult = getOrCreateNode(ctx, { x: e.x, y: e.y }, 5);
      const previewEnd = snapResult.isNew ? { x: e.x, y: e.y } : snapResult.snappedPoint;

      ctx.setTempShape({
        ...ctx.tempShape,
        geometry: {
          ...(ctx.tempShape as any).geometry,
          end: previewEnd,
        },
      } as any);
    }
  }

  onMouseUp(e: CanvasEvent, ctx: ToolContext) {
    // 连续绘制模式下，点的确定已在 onMouseDown 中完成，此处无需额外处理
  }

  onKeyDown(e: KeyboardEvent, ctx: ToolContext) {
    if (e.key === 'Escape') {
      // this.reset(); // <-- 取消 reset()，设置 start 为 null，清除临时形状，并切换到选择工具
      this.start = null;
      ctx.setTempShape(null);
      ctx.dispatch(setActiveTool('select')); // <-- 切换到选择状态，UI 会自动变蓝
    }
  }

  private reset() {
    this.isDrawing = false;
    this.lastPoint = null;
    this.lastNodeId = null;
  }

  private createTempShape(ctx: ToolContext, point: { x: number; y: number }, nodeId: string) {
    const state = ctx.getState();
    const scale = state.drawing.scaleDenominator;
    const d = getStructuralDefaults(scale, state.drawing.scaleNumerator).beam;
    const label = ensureLabel(ctx, 'beam');

    ctx.setTempShape({
      ...makeBase(ctx, 'beam', { start: point, end: point, width: d.width, depth: d.depth }),
      label,
      properties: {
        label,
        section: `${d.realWidth}×${d.realDepth}`,
        material: d.material,
        startNodeId: nodeId,
        endNodeId: nodeId,
      },
    } as any);
  }

  private finalizeShape(
    ctx: ToolContext,
    start: { x: number; y: number },
    end: { x: number; y: number },
    startNodeId: string,
    endNodeId: string
  ) {
    if (!ctx.tempShape) return;

    const newShape = {
      ...ctx.tempShape,
      id: nanoid(), // 生成正式的唯一 ID
      geometry: {
        ...(ctx.tempShape as any).geometry,
        start,
        end,
      },
      properties: {
        ...(ctx.tempShape as any).properties,
        startNodeId,
        endNodeId,
      },
    } as any;

    ctx.addShape(newShape);
  }

  // 3. 新增 onCancel，供右键事件调用
  onCancel(ctx: ToolContext) {
    this.start = null;
    ctx.setTempShape(null);
    ctx.dispatch(setActiveTool('select'));
  }
}
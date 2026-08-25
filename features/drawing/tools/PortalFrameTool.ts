import { BaseTool, CanvasEvent, ToolContext } from './BaseTool';
import { makeBase, ensureLabel, getOrCreateNode } from './structuralToolUtils';
import { getStructuralDefaults } from '../elements/elementDefaults';
import { nanoid } from '@reduxjs/toolkit';

export class PortalFrameTool extends BaseTool {
  cursor = 'crosshair';
  private isDrawing = false;
  private lastPoint: { x: number; y: number } | null = null;
  private lastNodeId: string | null = null;

  onMouseDown(e: CanvasEvent, ctx: ToolContext) {
    const rawEvent = e.rawEvent as MouseEvent;

    if (rawEvent.button === 2) {
      this.reset();
      ctx.setTempShape(null);
      return;
    }

    if (rawEvent.button === 0) {
      const snapResult = getOrCreateNode(ctx, { x: e.x, y: e.y }, 5);

      if (snapResult.isNew && snapResult.shape) {
        ctx.addShape(snapResult.shape);
      }

      if (!this.isDrawing) {
        this.isDrawing = true;
        this.lastPoint = snapResult.snappedPoint;
        this.lastNodeId = snapResult.id;
        this.createTempShape(ctx, this.lastPoint, this.lastNodeId);
      } else {
        const endPoint = snapResult.snappedPoint;
        const endNodeId = snapResult.id;

        this.finalizeShape(ctx, this.lastPoint!, endPoint, this.lastNodeId!, endNodeId);

        this.lastPoint = endPoint;
        this.lastNodeId = endNodeId;
        this.createTempShape(ctx, this.lastPoint, this.lastNodeId);
      }
    }
  }

  onMouseMove(e: CanvasEvent, ctx: ToolContext) {
    if (this.isDrawing && ctx.tempShape) {
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
    // 连续绘制模式下无需处理
  }

  onKeyDown(e: KeyboardEvent, ctx: ToolContext) {
    if (e.key === 'Escape') {
      this.reset();
      ctx.setTempShape(null);
    }
  }

  private reset() {
    this.isDrawing = false;
    this.lastPoint = null;
    this.lastNodeId = null;
  }

  private createTempShape(ctx: ToolContext, point: { x: number; y: number }, nodeId: string) {
    const state = ctx.getState();
    const d = getStructuralDefaults(
      state.drawing.scaleDenominator,
      state.drawing.scaleNumerator
    ).portalFrame;
    const label = ensureLabel(ctx, 'portalFrame');

    ctx.setTempShape({
      ...makeBase(ctx, 'portalFrame', {
        start: point,
        end: point,
        height: d.height,
        columnWidth: d.columnWidth,
        columnDepth: d.columnDepth,
        beamWidth: d.beamWidth,
        beamDepth: d.beamDepth,
      }),
      label,
      properties: {
        label,
        section: d.section,
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
      id: nanoid(),
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
}
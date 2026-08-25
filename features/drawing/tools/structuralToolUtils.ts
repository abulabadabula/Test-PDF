// src/features/drawing/tools/structuralToolUtils.ts

import type { ToolContext } from './BaseTool';
import type { StructuralElementType } from '../elements/elementTypes';
import {
  DEFAULT_ELEMENT_STYLE,
  getStructuralDefaults,
  prefixForType,
} from '../elements/elementDefaults';
import { nanoid } from '@reduxjs/toolkit';
import type { NodeElement } from '../elements/elementTypes';

// 创建基础结构元素，如节点、梁、柱等，带有默认样式和属性
export function makeBase(ctx: ToolContext, type: StructuralElementType, geometry: any) {
  const state = ctx.getState();
  const drawing = state.drawing;

  return {
    id: 'temp',
    type,
    pageIndex: state.pdf.currentPage,
    layerId: state.layer.activeLayerId,
    geometry,
    properties: {} as any,
    style: {
      ...DEFAULT_ELEMENT_STYLE,
      color: drawing.currentStrokeColor,
      strokeWidth: drawing.currentStrokeWidth,
      opacity: drawing.currentOpacity,
      fillColor: drawing.currentFillColor,
    },
    label: '',
    createdAt: '',
    updatedAt: '',
    zIndex: 0,
  } as any;
}

// 获取指定类型的结构元素默认值，考虑当前绘图比例
export function structuralDefaults(
  type: StructuralElementType,
  scaleDenominator: number,
  scaleNumerator = 1
) {
  if (type === 'node') return undefined;
  return getStructuralDefaults(scaleDenominator, scaleNumerator)[type];
}

export function ensureLabel(ctx: ToolContext, type: StructuralElementType) {
  const state = ctx.getState();
  const prefix = prefixForType(type);
  const used = state.drawing.shapes
    .filter((s: any) => s.type === type)
    .map((s: any) => s.label as string);

  let i = 1;
  while (used.includes(`${prefix}-${String(i).padStart(3, '0')}`)) i++;
  return `${prefix}-${String(i).padStart(3, '0')}`;
}

export function distance(p1: { x: number; y: number }, p2: { x: number; y: number }) {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

export interface NodeResult {
  id: string;
  isNew: boolean;
  shape?: any;
  snappedPoint: { x: number; y: number }; // 新增：返回实际吸附后的坐标
}

export function getOrCreateNode(
  ctx: ToolContext,
  point: { x: number; y: number },
  tolerance: number = 5 // 容差设为 5，提升吸附体验
): NodeResult {
  const state = ctx.getState();
  const nodes = state.drawing.shapes.filter((s: any) => s.type === 'node') as NodeElement[];

  // 1. 查找容差范围内的现有节点
  const existingNode = nodes.find((n) => distance(n.geometry, point) <= tolerance);

  if (existingNode) {
    return {
      id: existingNode.id,
      isNew: false,
      snappedPoint: { x: existingNode.geometry.x, y: existingNode.geometry.y },
    };
  }

  // 2. 若无，则准备一个新节点
  const newId = nanoid();
  const label = ensureLabel(ctx, 'node');
  const shape = {
    ...makeBase(ctx, 'node', { x: point.x, y: point.y }),
    id: newId,
    label,
    properties: {
      label,
    },
  } as any;

  return {
    id: newId,
    isNew: true,
    shape,
    snappedPoint: { x: point.x, y: point.y },
  };
}
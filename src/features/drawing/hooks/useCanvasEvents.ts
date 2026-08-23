// src/features/drawing/hooks/useCanvasEvents.ts

import { useEffect, useRef, RefObject } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { store } from '@/app/store';
import {
  addShape, updateShape, selectShape, clearSelection, deleteSelected,
  beginHistoryTransaction, endHistoryTransaction, copySelected, pasteClipboard,
  setActiveTool, undo, redo
} from '@/app/store/slices/drawingSlice';
import { setPageOrigin, selectPageCoordinateSystem, selectOriginMode, setOriginMode } from '@/app/store/slices/pageCoordinateSlice';
import type { Shape } from '@/app/store/slices/drawingSlice';
import type { StructuralElement } from '../elements/elementTypes';
import { BaseTool, ToolContext } from '../tools/BaseTool';
import { SelectTool } from '../tools/SelectTool';
import { PointTool } from '../tools/PointTool';
import { LineTool } from '../tools/LineTool';
import { PolylineTool } from '../tools/PolylineTool';
import { PolygonTool } from '../tools/PolygonTool';
import { RectangleTool } from '../tools/RectangleTool';
import { CircleTool } from '../tools/CircleTool';
import { TextTool } from '../tools/TextTool';
import { MeasureTool } from '../tools/MeasureTool';
import { EraserTool } from '../tools/EraserTool';
import { ColumnTool } from '../tools/ColumnTool';
import { BeamTool } from '../tools/BeamTool';
import { WallTool } from '../tools/WallTool';
import { SlabTool } from '../tools/SlabTool';
import { RectSlabTool } from '../tools/RectSlabTool';
import { PortalFrameTool } from '../tools/PortalFrameTool';
import { findSnapPoint } from '../snapping/snapEngine';
import { screenToPage } from '@/core/coordinate/coordinateUtils';
import { pagePointToEngineeringUnit } from '@/core/coordinate/pageCoordinateSystem';
import { emitCursorCoordinate, emitCursorCoordinateClear } from '@/core/coordinate/coordinateEvents';

const toolInstances: Record<string, BaseTool> = {
  select: new SelectTool(),
  column: new ColumnTool(),
  beam: new BeamTool(),
  wall: new WallTool(),
  slab: new SlabTool(),
  rectSlab: new RectSlabTool(),
  portalFrame: new PortalFrameTool(),
  point: new PointTool(),
  line: new LineTool(),
  polyline: new PolylineTool(),
  polygon: new PolygonTool(),
  rectangle: new RectangleTool(),
  circle: new CircleTool(),
  text: new TextTool(),
  measure: new MeasureTool(),
  eraser: new EraserTool(),
};

function isStructuralElement(shape: Shape): shape is StructuralElement {
  return (
    shape.type === 'column' ||
    shape.type === 'beam' ||
    shape.type === 'wall' ||
    shape.type === 'slab' ||
    shape.type === 'portalFrame'
  );
}

function isStructuralTool(tool: string): boolean {
  return (
    tool === 'column' ||
    tool === 'beam' ||
    tool === 'wall' ||
    tool === 'portalFrame' ||
    tool === 'slab'
  );
}

export function useCanvasEvents(
  canvasRef: RefObject<HTMLCanvasElement>,
  hitTest: (x: number, y: number) => Shape | null,
  tempShape: Shape | null,
  setTempShape: (shape: Shape | null) => void,
  showTextDialog: (x: number, y: number) => void,
  setSnapPoint: (point: { x: number; y: number } | null) => void,
  openProperties?: (shape: Shape | null) => void,
  setSelectionRect?: (rect: { x: number; y: number; width: number; height: number } | null) => void,
) {
  const dispatch = useAppDispatch();

  const activeTool = useAppSelector((state) => state.drawing.activeTool);
  const pdfScale = useAppSelector((state) => state.pdf.scale);
  const currentPage = useAppSelector((state) => state.pdf.currentPage);
  const coordinateSystem = useAppSelector((state) =>
    selectPageCoordinateSystem(state, currentPage)
  );
  const originMode = useAppSelector(selectOriginMode);

  // ==========================================================================
  // 1. 保持 Ref 同步 (核心修复：避免父组件未 useCallback 导致的闭包陷阱和 Effect 频繁重置)
  // ==========================================================================
  const activeToolRef = useRef(activeTool);
  const pdfScaleRef = useRef(pdfScale);
  const currentPageRef = useRef(currentPage);
  const coordinateSystemRef = useRef(coordinateSystem);
  const originModeRef = useRef(originMode);
  const tempShapeRef = useRef(tempShape);
  const hitTestRef = useRef(hitTest);
  const setTempShapeRef = useRef(setTempShape);
  const showTextDialogRef = useRef(showTextDialog);
  const setSnapPointRef = useRef(setSnapPoint);
  const openPropertiesRef = useRef(openProperties);
  const setSelectionRectRef = useRef(setSelectionRect);

  activeToolRef.current = activeTool;
  pdfScaleRef.current = pdfScale;
  currentPageRef.current = currentPage;
  coordinateSystemRef.current = coordinateSystem;
  originModeRef.current = originMode;
  tempShapeRef.current = tempShape;
  hitTestRef.current = hitTest;
  setTempShapeRef.current = setTempShape;
  showTextDialogRef.current = showTextDialog;
  setSnapPointRef.current = setSnapPoint;
  openPropertiesRef.current = openProperties;
  setSelectionRectRef.current = setSelectionRect;

  // ==========================================================================
  // 2. rAF 节流专用的 Ref
  // ==========================================================================
  const rafIdRef = useRef<number | null>(null);
  const latestPointRef = useRef<{ x: number; y: number } | null>(null);

  // ==========================================================================
  // 3. Effect 依赖项被精简到只有稳定引用，确保 Effect 不会频繁重置打断 rAF
  // ==========================================================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 所有状态读取均通过 Ref，确保获取的是最新值，且不会触发 Effect 重新运行
    const coords = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      return screenToPage(
        { x: event.clientX, y: event.clientY },
        rect,
        pdfScaleRef.current
      );
    };

    const emitCoordinate = (point: { x: number; y: number }) => {
      const cs = coordinateSystemRef.current;
      const engineering = pagePointToEngineeringUnit(point, cs);
      emitCursorCoordinate({
        pageIndex: currentPageRef.current,
        pagePoint: point,
        engineeringPoint: engineering,
        unit: cs.unit,
        scaleNumerator: cs.scaleNumerator,
        scaleDenominator: cs.scaleDenominator,
      });
    };

    // rAF 节流逻辑
    const emitCoordinateThrottled = (point: { x: number; y: number }) => {
      latestPointRef.current = point;
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          if (latestPointRef.current) {
            emitCoordinate(latestPointRef.current);
          }
          rafIdRef.current = null;
        });
      }
    };

    const getCtx = (): ToolContext => ({
      dispatch, // dispatch 引用在 React 中是绝对稳定的
      getState: store.getState,
      pdfScale: pdfScaleRef.current,
      tempShape: tempShapeRef.current,
      setTempShape: setTempShapeRef.current,
      hitTest: hitTestRef.current,
      showTextDialog: showTextDialogRef.current,
      addShape: (shape) => dispatch(addShape(shape)),
      updateShape: (id, changes) => dispatch(updateShape({ id, changes })),
      selectShape: (id, multiSelect) => dispatch(selectShape({ id, multiSelect })),
      clearSelection: () => dispatch(clearSelection()),
      deleteSelected: () => dispatch(deleteSelected()),
      beginHistory: () => dispatch(beginHistoryTransaction()),
      endHistory: () => dispatch(endHistoryTransaction()),
    });

    let selectionStart: { x: number; y: number } | null = null;

    const getStructuralElements = (): StructuralElement[] => {
      const state = store.getState();
      return state.drawing.shapes.filter(
        (shape): shape is StructuralElement =>
          shape.pageIndex === state.pdf.currentPage && isStructuralElement(shape)
      );
    };

    const handleMouseDown = (event: MouseEvent) => {
      const point = coords(event);

      if (originModeRef.current) {
        dispatch(setPageOrigin({ pageIndex: currentPageRef.current, x: point.x, y: point.y }));
        dispatch(setOriginMode(false));
        emitCoordinate(point); // 设置原点时立即触发，无需节流
        return;
      }

      if (activeToolRef.current === 'select' && !hitTestRef.current(point.x, point.y)) {
        selectionStart = point;
      }

      const structural = isStructuralTool(activeToolRef.current);
      let snappedPoint = point;

      if (structural) {
        const structuralElements = getStructuralElements();
        const state = store.getState();
        const snap = findSnapPoint(point, structuralElements, pdfScaleRef.current, {
          enabled: state.ui.snapEnabled,
          gridSize: state.ui.gridSize,
          types: state.ui.snapTypes,
        });
        snappedPoint = snap?.point ?? point;
      }

      setSnapPointRef.current(null);
      
      const tool = toolInstances[activeToolRef.current] ?? toolInstances.select;
      tool.onMouseDown({ x: snappedPoint.x, y: snappedPoint.y, rawEvent: event }, getCtx());
    };

    const handleMouseMove = (event: MouseEvent) => {
      const point = coords(event);

      // 🚀 优化点：使用 rAF 节流，大幅降低高频事件派发
      emitCoordinateThrottled(point);

      if (selectionStart) {
        setSelectionRectRef.current?.({
          x: Math.min(selectionStart.x, point.x),
          y: Math.min(selectionStart.y, point.y),
          width: Math.abs(point.x - selectionStart.x),
          height: Math.abs(point.y - selectionStart.y),
        });
      }

      const structural = isStructuralTool(activeToolRef.current);
      let snapPoint: { x: number; y: number } | null = null;

      if (structural) {
        const structuralElements = getStructuralElements();
        const state = store.getState();
        const snap = findSnapPoint(point, structuralElements, pdfScaleRef.current, {
          enabled: state.ui.snapEnabled,
          gridSize: state.ui.gridSize,
          types: state.ui.snapTypes,
        });
        snapPoint = snap?.point ?? null;
      }

      setSnapPointRef.current(snapPoint);
      const toolPoint = snapPoint ?? point;

      const tool = toolInstances[activeToolRef.current] ?? toolInstances.select;
      tool.onMouseMove({ x: toolPoint.x, y: toolPoint.y, rawEvent: event }, getCtx());
    };

    const handleMouseLeave = () => {
      // 离开画布时取消 pending 的 rAF，防止幽灵事件
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      latestPointRef.current = null;
      
      emitCursorCoordinateClear();
      setSnapPointRef.current(null);
    };

    const handleMouseUp = (event: MouseEvent) => {
      const point = coords(event);
      selectionStart = null;
      setSelectionRectRef.current?.(null);

      const tool = toolInstances[activeToolRef.current] ?? toolInstances.select;
      tool.onMouseUp({ x: point.x, y: point.y, rawEvent: event }, getCtx());

      if (
        activeToolRef.current !== 'beam' &&
        activeToolRef.current !== 'wall' &&
        activeToolRef.current !== 'portalFrame'
      ) {
        setSnapPointRef.current(null);
      }
    };

    const handleDoubleClick = (event: MouseEvent) => {
      const point = coords(event);
      if (activeToolRef.current === 'select') {
        openPropertiesRef.current?.(hitTestRef.current(point.x, point.y));
        return;
      }
      const tool = toolInstances[activeToolRef.current] ?? toolInstances.select;
      tool.onDblClick?.({ x: point.x, y: point.y, rawEvent: event }, getCtx());
    };

    const isTyping = (target: EventTarget | null): boolean => {
      const element = target as HTMLElement | null;
      if (!element) return false;
      return (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) ||
        !!element.closest('[contenteditable="true"]')
      );
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return;

      if (event.key === 'Escape' && originModeRef.current) {
        dispatch(setOriginMode(false));
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        dispatch(deleteSelected());
        return;
      }

      const key = event.key.toLowerCase();

      if ((event.ctrlKey || event.metaKey) && key === 'c') {
        event.preventDefault();
        dispatch(copySelected());
        return;
      }

      if ((event.ctrlKey || event.metaKey) && key === 'v') {
        event.preventDefault();
        dispatch(pasteClipboard());
        return;
      }

      if ((event.ctrlKey || event.metaKey) && key === 'z') {
        event.preventDefault();
        dispatch(event.shiftKey ? redo() : undo());
        return;
      }

      if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        const toolMap: Record<string, string> = {
          v: 'select', c: 'column', b: 'beam', w: 'wall', s: 'slab', f: 'rectSlab', p: 'portalFrame', m: 'measure',
        };
        const nextTool = toolMap[key];
        if (nextTool) {
          event.preventDefault();
          dispatch(setActiveTool(nextTool as any));
          return;
        }
      }

      const tool = toolInstances[activeToolRef.current] ?? toolInstances.select;
      tool.onKeyDown?.(event, getCtx());
    };

    const handleContextMenu = (event: MouseEvent) => {
      const currentTool = activeToolRef.current;
      // 如果当前不是选择工具，则拦截右键，取消绘制并切换回选择工具
      if (currentTool !== 'select') {
        event.preventDefault(); // 阻止浏览器默认右键菜单
        
        const tool = toolInstances[currentTool] ?? toolInstances.select;
        tool.onCancel?.(getCtx()); // 清理工具内部状态 (如 start) 和 tempShape
        
        dispatch(setActiveTool('select')); // 切换回选择工具
      }
    };

    // 更新初始鼠标样式
    const initialTool = toolInstances[activeToolRef.current] ?? toolInstances.select;
    canvas.style.cursor = originModeRef.current ? 'crosshair' : initialTool.cursor;

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('dblclick', handleDoubleClick);
    canvas.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('dblclick', handleDoubleClick);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);

      // 组件卸载时清理 rAF
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      emitCursorCoordinateClear();
    };
  }, [canvasRef, dispatch]); // 🚀 核心修复：依赖项极少，Effect 几乎不会重新运行，保证 rAF 稳定执行
}
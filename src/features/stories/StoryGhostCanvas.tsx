// src/features/stories/StoryGhostCanvas.tsx

import { useEffect, useRef } from 'react';
import { useAppSelector } from '@/app/store/hooks';
import {
  applyMatrix,
  baseFrameForSheet,
  frameForStory,
  matrixRotation,
  matrixScale,
  storyMatrix,
} from '@/core/coordinate/storyTransform';
import { isStructural } from './storyGeometry';
import {
  nodesOfStory,
  pairNodes,
} from './storyLinks';
import { useParentResize } from './useParentResize';
import { selectActivePlanSheet } from '@/app/store/slices/planSheetSlice';

export function StoryGhostCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const resizeVersion = useParentResize(ref);

  const stories = useAppSelector(
    (state) => state.story.stories,
  );
  const activeSheet = useAppSelector(
    selectActivePlanSheet,
  );
  const showLinks = useAppSelector(
    (state) => state.story.showLinks,
  );
  const toleranceMm = useAppSelector(
    (state) => state.story.linkToleranceMm,
  );
  const shapes = useAppSelector(
    (state) => state.drawing.shapes,
  );
  const pageSystems = useAppSelector(
    (state) => state.pageCoordinate.pages,
  );
  const sheetSystems = useAppSelector(
    (state) => state.pageCoordinate.sheets,
  );
  const planSheets = useAppSelector(
    (state) => state.planSheet.sheets,
  );
  const displayScale = useAppSelector(
    (state) => state.pdf.scale,
  );

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const frame = requestAnimationFrame(() => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (!width || !height || !activeSheet) return;

      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.max(
        1,
        Math.ceil(width * dpr),
      );
      canvas.height = Math.max(
        1,
        Math.ceil(height * dpr),
      );

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.setTransform(
        displayScale * dpr,
        0,
        0,
        displayScale * dpr,
        0,
        0,
      );

      // The active Plan Sheet may be cropped. Ghost geometry remains in
      // source-page coordinates and is shifted into the visible crop viewport.
      if (activeSheet.crop) {
        ctx.translate(
          -activeSheet.crop.x,
          -activeSheet.crop.y,
        );
      }

      const baseStory = stories.find(
        (story) => story.sheetId === activeSheet.id,
      );

      // A base Story is optional: reference-only sheets can be the base view
      // too (they just have no modelled nodes to link against).
      const baseFrame = baseFrameForSheet(
        pageSystems,
        sheetSystems,
        activeSheet,
        stories,
      );

      const baseNodes = baseStory
        ? nodesOfStory(
            shapes,
            baseStory,
            pageSystems,
            sheetSystems,
            planSheets,
          )
        : [];

      const px =
        1 / Math.max(displayScale, 0.0001);

      for (const story of stories) {
        if (
          !story.overlayVisible ||
          story.sheetId === activeSheet.id
        ) {
          continue;
        }

        const from = frameForStory(
          pageSystems,
          sheetSystems,
          story,
          planSheets,
        );

        const matrix = storyMatrix(
          from,
          baseFrame,
        );

        const matrixScaleValue =
          matrixScale(matrix);
        const matrixRotationValue =
          matrixRotation(matrix);

        const toBase = (
          point: { x: number; y: number },
        ) => applyMatrix(matrix, point);

        if (story.showGhostElements) {
          ctx.save();
          ctx.globalAlpha = Math.min(
            1,
            story.overlayOpacity + 0.25,
          );
          ctx.strokeStyle = story.tint;
          ctx.fillStyle = story.tint;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';

          for (const shape of shapes) {
            if (
              shape.sheetId &&
              shape.sheetId !== story.sheetId
            ) {
              continue;
            }

            if (
              !shape.sheetId &&
              !story.sheetId.startsWith(
                'legacy-page-',
              )
            ) {
              continue;
            }

            if (
              shape.pageIndex !==
              (planSheets.find(
                (sheet) =>
                  sheet.id === story.sheetId,
              )?.sourcePage ??
                story.pageIndex)
            ) {
              continue;
            }

            if (!isStructural(shape)) continue;

            switch (shape.type) {
              case 'beam':
              case 'wall': {
                const a = toBase(
                  shape.geometry.start,
                );
                const b = toBase(
                  shape.geometry.end,
                );

                ctx.lineWidth =
                  (shape.type === 'wall' ? 3 : 2) *
                  px;

                ctx.setLineDash(
                  shape.type === 'wall'
                    ? []
                    : [6 * px, 3 * px],
                );

                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
                break;
              }

              case 'portalFrame': {
                const a = toBase(
                  shape.geometry.start,
                );
                const b = toBase(
                  shape.geometry.end,
                );

                ctx.lineWidth = 2 * px;
                ctx.setLineDash([2 * px, 3 * px]);

                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
                break;
              }

              case 'slab': {
                const points =
                  shape.geometry.points.map(toBase);

                if (points.length < 3) break;

                ctx.lineWidth = 1.5 * px;
                ctx.setLineDash([
                  8 * px,
                  4 * px,
                ]);

                ctx.beginPath();
                points.forEach((point, index) => {
                  if (index === 0) {
                    ctx.moveTo(point.x, point.y);
                  } else {
                    ctx.lineTo(point.x, point.y);
                  }
                });

                ctx.closePath();

                ctx.save();
                ctx.globalAlpha *= 0.15;
                ctx.fill();
                ctx.restore();

                ctx.stroke();
                break;
              }

              case 'column': {
                const geometry = shape.geometry;
                const center = toBase({
                  x:
                    geometry.x +
                    geometry.width / 2,
                  y:
                    geometry.y +
                    geometry.depth / 2,
                });

                const columnWidth = Math.max(
                  geometry.width *
                    matrixScaleValue,
                  4 * px,
                );

                const columnDepth = Math.max(
                  geometry.depth *
                    matrixScaleValue,
                  4 * px,
                );

                ctx.save();
                ctx.translate(
                  center.x,
                  center.y,
                );
                ctx.rotate(
                  matrixRotationValue +
                    ((geometry.rotation || 0) *
                      Math.PI) /
                      180,
                );
                ctx.lineWidth =
                  1.5 * px;
                ctx.setLineDash([]);
                ctx.strokeRect(
                  -columnWidth / 2,
                  -columnDepth / 2,
                  columnWidth,
                  columnDepth,
                );
                ctx.restore();
                break;
              }

              default:
                break;
            }
          }

          ctx.restore();
        }

        if (showLinks) {
          const ghostNodes = nodesOfStory(
            shapes,
            story,
            pageSystems,
            sheetSystems,
            planSheets,
          );

          const pairs = pairNodes(
            baseNodes,
            ghostNodes,
            toleranceMm,
          );

          const linked = new Set(
            pairs.map((pair) => pair.b.id),
          );

          ctx.save();
          ctx.lineWidth = 1.5 * px;

          for (const node of ghostNodes) {
            const point = toBase(node.page);

            ctx.beginPath();

            if (linked.has(node.id)) {
              ctx.strokeStyle = story.tint;
              ctx.setLineDash([]);
              ctx.arc(
                point.x,
                point.y,
                4 * px,
                0,
                Math.PI * 2,
              );
            } else {
              ctx.strokeStyle = '#f97316';
              ctx.setLineDash([
                2 * px,
                2 * px,
              ]);
              ctx.arc(
                point.x,
                point.y,
                6 * px,
                0,
                Math.PI * 2,
              );
            }

            ctx.stroke();
          }

          ctx.setLineDash([]);
          ctx.strokeStyle = '#16a34a';
          ctx.lineWidth = 2 * px;

          for (const pair of pairs) {
            ctx.beginPath();
            ctx.arc(
              pair.a.page.x,
              pair.a.page.y,
              9 * px,
              0,
              Math.PI * 2,
            );
            ctx.stroke();
          }

          ctx.restore();
        }
      }
    });

    return () =>
      cancelAnimationFrame(frame);
  }, [
    stories,
    activeSheet,
    showLinks,
    toleranceMm,
    shapes,
    pageSystems,
    sheetSystems,
    planSheets,
    displayScale,
    resizeVersion,
  ]);

  return (
    <canvas
      ref={ref}
      className="absolute inset-0 h-full w-full pointer-events-none"
      style={{ zIndex: 8 }}
    />
  );
}

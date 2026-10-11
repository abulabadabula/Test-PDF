// src/features/stories/StoryOverlayStack.tsx

import { useEffect, useMemo, useRef } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';

import { useAppSelector } from '@/app/store/hooks';
import type { Story } from '@/app/store/slices/storySlice';
import {
  baseFrameForSheet,
  frameForStory,
  storyMatrix,
  sourcePageForStory,
  matrixScale,
} from '@/core/coordinate/storyTransform';
import {
  selectActivePlanSheet,
  selectPlanSheets,
} from '@/app/store/slices/planSheetSlice';
import { useParentResize } from './useParentResize';

const MAX_BITMAP_SIDE = 4096;

interface CachedBitmap {
  key: string;
  canvas: HTMLCanvasElement;
  R: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const match = /^#?([0-9a-f]{6})$/i.exec(
    hex.trim(),
  );

  if (!match) {
    return [239, 68, 68];
  }

  const number = parseInt(match[1], 16);

  return [
    (number >> 16) & 255,
    (number >> 8) & 255,
    number & 255,
  ];
}

function tintToAlpha(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  tint: string,
) {
  const image = ctx.getImageData(
    0,
    0,
    width,
    height,
  );

  const pixels = image.data;
  const [red, green, blue] =
    hexToRgb(tint);

  for (
    let index = 0;
    index < pixels.length;
    index += 4
  ) {
    const luminance =
      0.299 * pixels[index] +
      0.587 * pixels[index + 1] +
      0.114 * pixels[index + 2];

    pixels[index] = red;
    pixels[index + 1] = green;
    pixels[index + 2] = blue;
    pixels[index + 3] = 255 - luminance;
  }

  ctx.putImageData(image, 0, 0);
}

function StoryOverlayCanvas({
  pdfDocument,
  story,
  zIndex,
}: {
  pdfDocument: PDFDocumentProxy;
  story: Story;
  zIndex: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const cache = useRef<CachedBitmap | null>(null);
  const resizeVersion = useParentResize(ref);

  const displayScale = useAppSelector(
    (state) => state.pdf.scale,
  );
  const pageSystems = useAppSelector(
    (state) => state.pageCoordinate.pages,
  );
  const sheetSystems = useAppSelector(
    (state) => state.pageCoordinate.sheets,
  );
  const planSheets = useAppSelector(
    selectPlanSheets,
  );

  const baseSheet = useAppSelector(
    selectActivePlanSheet,
  );

  const stories = useAppSelector(
    (state) => state.story.stories,
  );

  const from = useMemo(
    () =>
      frameForStory(
        pageSystems,
        sheetSystems,
        story,
        planSheets,
      ),
    [
      pageSystems,
      sheetSystems,
      story,
      planSheets,
    ],
  );

  // The base frame no longer requires the active Plan Sheet to have a Story,
  // so reference-only sheets can also be used as the base view.
  const base = useMemo(
    () =>
      baseSheet
        ? baseFrameForSheet(
            pageSystems,
            sheetSystems,
            baseSheet,
            stories,
          )
        : null,
    [
      pageSystems,
      sheetSystems,
      baseSheet,
      stories,
    ],
  );

  const docKey =
    pdfDocument.fingerprints?.join('') ?? '';

  useEffect(() => {
    const canvas = ref.current;

    if (!canvas || !base || !baseSheet) {
      return;
    }

    let cancelled = false;
    let task: RenderTask | null = null;

    const run = async () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (!width || !height) return;

      const dpr =
        window.devicePixelRatio || 1;

      const deviceScale =
        displayScale * dpr;

      const matrix = storyMatrix(
        from,
        base,
      );

      const matrixScaleValue =
        matrixScale(matrix);

      if (
        !Number.isFinite(
          matrixScaleValue,
        ) ||
        matrixScaleValue <= 0
      ) {
        return;
      }

      const sourcePage =
        sourcePageForStory(
          story,
          planSheets,
        );

      const page =
        await pdfDocument.getPage(
          sourcePage,
        );

      if (cancelled) return;

      const unitViewport =
        page.getViewport({
          scale: 1,
        });

      const resolution = Math.min(
        deviceScale * matrixScaleValue,
        MAX_BITMAP_SIDE /
          Math.max(
            unitViewport.width,
            unitViewport.height,
          ),
      );

      const cacheKey =
        `${docKey}|${sourcePage}|${resolution.toFixed(
          3,
        )}|${story.tint}`;

      let bitmap =
        cache.current &&
        cache.current.key === cacheKey
          ? cache.current
          : null;

      if (!bitmap) {
        const viewport =
          page.getViewport({
            scale: resolution,
          });

        const offscreen =
          window.document.createElement(
            'canvas',
          );

        offscreen.width = Math.ceil(
          viewport.width,
        );

        offscreen.height = Math.ceil(
          viewport.height,
        );

        const context =
          offscreen.getContext(
            '2d',
            { willReadFrequently: true },
          );

        if (!context) return;

        task = page.render({
          canvasContext: context,
          viewport,
        });

        await task.promise;
        task = null;

        if (cancelled) return;

        tintToAlpha(
          context,
          offscreen.width,
          offscreen.height,
          story.tint,
        );

        bitmap = {
          key: cacheKey,
          canvas: offscreen,
          R: resolution,
        };

        cache.current = bitmap;
      }

      const crop =
        planSheets.find(
          (sheet) =>
            sheet.id === story.sheetId,
        )?.crop ?? {
          x: 0,
          y: 0,
          width:
            unitViewport.width,
          height:
            unitViewport.height,
        };

      canvas.width = Math.max(
        1,
        Math.ceil(width * dpr),
      );

      canvas.height = Math.max(
        1,
        Math.ceil(height * dpr),
      );

      const context =
        canvas.getContext('2d');

      if (!context) return;

      context.setTransform(
        1,
        0,
        0,
        1,
        0,
        0,
      );

      context.clearRect(
        0,
        0,
        canvas.width,
        canvas.height,
      );

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';

      const pixelsToBasePage =
        deviceScale / bitmap.R;

      const baseCropX =
        matrix[0] * crop.x +
        matrix[2] * crop.y +
        matrix[4];

      const baseCropY =
        matrix[1] * crop.x +
        matrix[3] * crop.y +
        matrix[5];

      // The destination canvas is itself a cropped view of the base Plan
      // Sheet, so its (0,0) corresponds to baseSheet.crop.x/y in source-page
      // coordinates.
      const baseViewportOriginX =
        baseSheet.crop.x;

      const baseViewportOriginY =
        baseSheet.crop.y;

      context.setTransform(
        matrix[0] *
          pixelsToBasePage,
        matrix[1] *
          pixelsToBasePage,
        matrix[2] *
          pixelsToBasePage,
        matrix[3] *
          pixelsToBasePage,
        (baseCropX - baseViewportOriginX) *
          deviceScale,
        (baseCropY - baseViewportOriginY) *
          deviceScale,
      );

      // Opacity is applied once, through the canvas' CSS opacity below, so the
      // slider maps linearly to what the user sees (it used to be applied
      // twice, i.e. squared) and changing it never needs a re-render.
      context.globalAlpha = 1;

      context.drawImage(
        bitmap.canvas,
        crop.x * bitmap.R,
        crop.y * bitmap.R,
        crop.width * bitmap.R,
        crop.height * bitmap.R,
        0,
        0,
        crop.width * bitmap.R,
        crop.height * bitmap.R,
      );

      context.globalAlpha = 1;
    };

    run().catch((error) => {
      if (
        (error as Error)?.name !==
        'RenderingCancelledException'
      ) {
        console.error(
          'Story overlay error:',
          error,
        );
      }
    });

    return () => {
      cancelled = true;

      try {
        task?.cancel();
      } catch {
        // Ignore cancellation errors.
      }
    };
  }, [
    pdfDocument,
    docKey,
    story,
    baseSheet,
    from,
    base,
    displayScale,
    planSheets,
    resizeVersion,
  ]);

  return (
    <canvas
      ref={ref}
      className="absolute inset-0 h-full w-full pointer-events-none"
      style={{
        opacity: Math.max(
          0,
          Math.min(1, story.overlayOpacity),
        ),
        zIndex,
        mixBlendMode: 'multiply',
      }}
    />
  );
}

export function StoryOverlayStack({
  pdfDocument,
}: {
  pdfDocument: PDFDocumentProxy;
}) {
  const stories = useAppSelector(
    (state) => state.story.stories,
  );

  const activeSheet =
    useAppSelector(
      selectActivePlanSheet,
    );

  const planSheets =
    useAppSelector(
      selectPlanSheets,
    );

  const visible = stories
    .filter(
      (story) =>
        story.overlayVisible &&
        story.sheetId !==
          activeSheet?.id &&
        planSheets.some(
          (sheet) =>
            sheet.id === story.sheetId &&
            sheet.visible,
        ),
    )
    .sort(
      (a, b) =>
        a.elevationMm -
        b.elevationMm,
    );

  return (
    <>
      {visible.map((story, index) => (
        <StoryOverlayCanvas
          key={story.id}
          pdfDocument={pdfDocument}
          story={story}
          zIndex={6 + index}
        />
      ))}
    </>
  );
}

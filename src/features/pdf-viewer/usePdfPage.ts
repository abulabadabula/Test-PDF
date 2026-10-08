import {
  useEffect,
  useRef,
  useState,
} from 'react';

import type {
  PDFDocumentProxy,
  PDFPageProxy,
  RenderTask,
} from 'pdfjs-dist';
import type { CropRect } from '@/features/plan-sheets/planSheetTypes';

interface PdfViewport {
  width: number;
  height: number;
}

export function usePdfPage(
  document: PDFDocumentProxy | null,
  pageNumber: number,
  scale: number,
  rotation = 0,
  crop: CropRect | null = null,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const pageRef = useRef<PDFPageProxy | null>(null);
  const [viewport, setViewport] = useState<PdfViewport | null>(null);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;

    if (!document || !canvas || pageNumber < 1) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const renderPage = async () => {
      try {
        try {
          renderTaskRef.current?.cancel();
        } catch {
          // Ignore cancellation errors.
        }
        renderTaskRef.current = null;

        const page = await document.getPage(pageNumber);
        if (cancelled) return;

        pageRef.current = page;

        const pdfViewport = page.getViewport({
          scale,
          rotation,
        });

        const dpr = window.devicePixelRatio || 1;

        // Crop rectangles are stored in unscaled page coordinates. For now,
        // crop rendering is applied to the normal (0°) PDF page coordinate
        // system; rotated pages continue to render as full pages.
        const cropEnabled =
          Boolean(crop) &&
          rotation % 360 === 0 &&
          crop!.width > 0 &&
          crop!.height > 0;

        const width = cropEnabled
          ? crop!.width * scale
          : pdfViewport.width;

        const height = cropEnabled
          ? crop!.height * scale
          : pdfViewport.height;

        setViewport({ width, height });

        canvas.width = Math.max(1, Math.ceil(width * dpr));
        canvas.height = Math.max(1, Math.ceil(height * dpr));
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.clearRect(0, 0, width, height);

        const transform = cropEnabled
          ? [
              1,
              0,
              0,
              1,
              -crop!.x * scale,
              -crop!.y * scale,
            ] as [number, number, number, number, number, number]
          : undefined;

        const renderTask = page.render({
          canvasContext: context,
          viewport: pdfViewport,
          ...(transform ? { transform } : {}),
        });

        renderTaskRef.current = renderTask;
        await renderTask.promise;

        if (renderTaskRef.current === renderTask) {
          renderTaskRef.current = null;
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === 'RenderingCancelledException'
        ) {
          return;
        }

        if (!cancelled) {
          console.error('Error rendering PDF page:', error);
        }
      }
    };

    const timer = window.setTimeout(() => {
      void renderPage();
    }, 50);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);

      try {
        renderTaskRef.current?.cancel();
      } catch {
        // Ignore cancellation errors.
      }

      renderTaskRef.current = null;
      pageRef.current = null;
    };
  }, [
    document,
    pageNumber,
    scale,
    rotation,
    crop?.x,
    crop?.y,
    crop?.width,
    crop?.height,
  ]);

  return {
    canvasRef,
    viewport,
    page: pageRef.current,
  };
}

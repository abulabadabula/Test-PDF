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

interface PdfViewport {
  width: number;
  height: number;
}

export function usePdfPage(
  document: PDFDocumentProxy | null,
  pageNumber: number,
  scale: number,
  rotation = 0
) {
  const canvasRef =
    useRef<HTMLCanvasElement>(null);

  const renderTaskRef =
    useRef<RenderTask | null>(null);

  const pageRef =
    useRef<PDFPageProxy | null>(null);

  const [viewport, setViewport] =
    useState<PdfViewport | null>(null);

  useEffect(() => {
    let cancelled = false;

    const canvas =
      canvasRef.current;

    if (
      !document ||
      !canvas ||
      pageNumber < 1
    ) {
      return;
    }

    const context =
      canvas.getContext('2d');

    if (!context) {
      return;
    }

    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {
            // Ignore cancellation errors.
          }

          renderTaskRef.current = null;
        }

        const page =
          await document.getPage(
            pageNumber
          );

        if (cancelled) {
          return;
        }

        pageRef.current = page;

        const pdfViewport =
          page.getViewport({
            scale,
            rotation,
          });

        const dpr =
          window.devicePixelRatio || 1;

        setViewport({
          width: pdfViewport.width,
          height: pdfViewport.height,
        });

        canvas.width =
          Math.ceil(
            pdfViewport.width * dpr
          );

        canvas.height =
          Math.ceil(
            pdfViewport.height * dpr
          );

        canvas.style.width =
          `${pdfViewport.width}px`;

        canvas.style.height =
          `${pdfViewport.height}px`;

        context.setTransform(
          dpr,
          0,
          0,
          dpr,
          0,
          0
        );

        context.clearRect(
          0,
          0,
          pdfViewport.width,
          pdfViewport.height
        );

        const renderTask =
          page.render({
            canvasContext: context,
            viewport: pdfViewport,
          });

        renderTaskRef.current =
          renderTask;

        await renderTask.promise;

        if (
          renderTaskRef.current ===
          renderTask
        ) {
          renderTaskRef.current = null;
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.name ===
            'RenderingCancelledException'
        ) {
          return;
        }

        if (!cancelled) {
          console.error(
            'Error rendering PDF page:',
            error
          );
        }
      }
    };

    const timer = window.setTimeout(
      () => {
        void renderPage();
      },
      50
    );

    return () => {
      cancelled = true;

      window.clearTimeout(timer);

      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // Ignore cancellation errors.
        }

        renderTaskRef.current = null;
      }

      pageRef.current = null;
    };
  }, [
    document,
    pageNumber,
    scale,
    rotation,
  ]);

  return {
    canvasRef,
    viewport,
    page: pageRef.current,
  };
}
// src/features/stories/StoryOverlayStack.tsx
//
// Draws other PDF pages (stories) on top of the base plan:
//   * white paper -> transparent, dark linework -> story tint colour
//   * mapped onto the base page with the story's affine matrix
//     (page origin + drawing scale + manual adjustment)
//   * opacity is plain CSS, so dragging the slider never re-renders the PDF
//   * the tinted bitmap is cached per (page, resolution, tint); moving /
//     rotating a level, toggling it, or changing opacity only re-blits it.

import { useEffect, useMemo, useRef } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { useAppSelector } from '@/app/store/hooks';
import type { Story } from '@/app/store/slices/storySlice';
import { frameOf, storyMatrix } from '@/core/coordinate/storyTransform';
import { useParentResize } from './useParentResize';

const MAX_BITMAP_SIDE = 4096;

interface CachedBitmap { key: string; canvas: HTMLCanvasElement; R: number }

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [239, 68, 68];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** luminance -> alpha, colour -> tint. */
function tintToAlpha(ctx: CanvasRenderingContext2D, w: number, h: number, tint: string) {
  const img = ctx.getImageData(0, 0, w, h);
  const px = img.data;
  const [tr, tg, tb] = hexToRgb(tint);
  for (let i = 0; i < px.length; i += 4) {
    const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    px[i] = tr;
    px[i + 1] = tg;
    px[i + 2] = tb;
    px[i + 3] = 255 - lum;
  }
  ctx.putImageData(img, 0, 0);
}

function StoryOverlayCanvas({
  pdfDocument, story, baseStory, zIndex,
}: { pdfDocument: PDFDocumentProxy; story: Story; baseStory: Story | undefined; zIndex: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const cache = useRef<CachedBitmap | null>(null);
  const resizeVersion = useParentResize(ref);

  const displayScale = useAppSelector((s) => s.pdf.scale);
  const basePage = useAppSelector((s) => s.pdf.currentPage);
  const pages = useAppSelector((s) => s.pageCoordinate.pages);

  const from = useMemo(() => frameOf(pages, story.pageIndex, story.adjust), [pages, story.pageIndex, story.adjust]);
  const base = useMemo(() => frameOf(pages, basePage, baseStory?.adjust), [pages, basePage, baseStory?.adjust]);
  const docKey = pdfDocument.fingerprints?.join('') ?? '';

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let cancelled = false;
    let task: RenderTask | null = null;

    const run = async () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;

      const dpr = window.devicePixelRatio || 1;
      const k = displayScale * dpr;
      const m = storyMatrix(from, base);
      const sx = Math.hypot(m[0], m[1]);
      if (!Number.isFinite(sx) || sx <= 0) return;

      const page = await pdfDocument.getPage(story.pageIndex);
      if (cancelled) return;

      const unit = page.getViewport({ scale: 1 });
      const R = Math.min(k * sx, MAX_BITMAP_SIDE / Math.max(unit.width, unit.height));
      const key = `${docKey}|${story.pageIndex}|${R.toFixed(3)}|${story.tint}`;

      let bitmap = cache.current && cache.current.key === key ? cache.current : null;
      if (!bitmap) {
        const vp = page.getViewport({ scale: R });
        const off = window.document.createElement('canvas');
        off.width = Math.ceil(vp.width);
        off.height = Math.ceil(vp.height);
        const octx = off.getContext('2d', { willReadFrequently: true });
        if (!octx) return;
        task = page.render({ canvasContext: octx, viewport: vp });
        await task.promise;
        task = null;
        if (cancelled) return;
        tintToAlpha(octx, off.width, off.height, story.tint);
        bitmap = { key, canvas: off, R };
        cache.current = bitmap;
      }

      canvas.width = Math.max(1, Math.ceil(w * dpr));
      canvas.height = Math.max(1, Math.ceil(h * dpr));
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      // offscreen px -> base page pts (m / R) -> device px (k)
      const f = k / bitmap.R;
      ctx.setTransform(m[0] * f, m[1] * f, m[2] * f, m[3] * f, m[4] * k, m[5] * k);
      ctx.drawImage(bitmap.canvas, 0, 0);
    };

    run().catch((err) => {
      if ((err as Error)?.name !== 'RenderingCancelledException') console.error('Story overlay error:', err);
    });

    return () => {
      cancelled = true;
      try { task?.cancel(); } catch { /* ignore */ }
    };
  }, [pdfDocument, docKey, story.pageIndex, story.tint, from, base, displayScale, resizeVersion]);

  return (
    <canvas
      ref={ref}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: story.overlayOpacity, zIndex, mixBlendMode: 'multiply' }}
    />
  );
}

export function StoryOverlayStack({ pdfDocument }: { pdfDocument: PDFDocumentProxy }) {
  const stories = useAppSelector((s) => s.story.stories);
  const currentPage = useAppSelector((s) => s.pdf.currentPage);
  const totalPages = useAppSelector((s) => s.pdf.totalPages);

  const baseStory = stories.find((s) => s.pageIndex === currentPage);
  const visible = stories
    .filter((s) => s.overlayVisible && s.pageIndex !== currentPage && s.pageIndex >= 1 && s.pageIndex <= totalPages)
    .sort((a, b) => a.elevationMm - b.elevationMm);

  return (
    <>
      {visible.map((story, i) => (
        <StoryOverlayCanvas
          key={story.id}
          pdfDocument={pdfDocument}
          story={story}
          baseStory={baseStory}
          zIndex={6 + i}
        />
      ))}
    </>
  );
}

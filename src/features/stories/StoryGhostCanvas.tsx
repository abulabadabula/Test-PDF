// src/features/stories/StoryGhostCanvas.tsx
//
// Read-only "ghost" of the other levels' structural elements and boundary
// points, drawn in the active page's coordinates. It is a separate canvas that
// ignores pointer events, so ghosts can never be selected or moved by accident.
// Node pairs that are vertically linked get a green ring on the active level;
// nodes of other levels without a partner are shown as dashed orange rings.

import { useEffect, useRef } from 'react';
import { useAppSelector } from '@/app/store/hooks';
import { applyMatrix, frameOf, matrixRotation, matrixScale, storyMatrix } from '@/core/coordinate/storyTransform';
import { isStructural } from './storyGeometry';
import { nodesOfStory, pairNodes } from './storyLinks';
import { useParentResize } from './useParentResize';

export function StoryGhostCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const resizeVersion = useParentResize(ref);

  const stories = useAppSelector((s) => s.story.stories);
  const showLinks = useAppSelector((s) => s.story.showLinks);
  const toleranceMm = useAppSelector((s) => s.story.linkToleranceMm);
  const shapes = useAppSelector((s) => s.drawing.shapes);
  const pages = useAppSelector((s) => s.pageCoordinate.pages);
  const currentPage = useAppSelector((s) => s.pdf.currentPage);
  const displayScale = useAppSelector((s) => s.pdf.scale);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const frame = requestAnimationFrame(() => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.ceil(w * dpr));
      canvas.height = Math.max(1, Math.ceil(h * dpr));
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(displayScale * dpr, 0, 0, displayScale * dpr, 0, 0);

      const px = 1 / Math.max(displayScale, 0.0001); // one screen pixel in page units
      const baseStory = stories.find((s) => s.pageIndex === currentPage);
      const baseFrame = frameOf(pages, currentPage, baseStory?.adjust);
      const baseNodes = baseStory ? nodesOfStory(shapes, baseStory, pages) : [];

      for (const story of stories) {
        if (!story.overlayVisible || story.pageIndex === currentPage) continue;
        const from = frameOf(pages, story.pageIndex, story.adjust);
        const m = storyMatrix(from, baseFrame);
        const s = matrixScale(m);
        const rot = matrixRotation(m);
        const tp = (p: { x: number; y: number }) => applyMatrix(m, p);

        // ---- ghost elements ------------------------------------------------
        if (story.showGhostElements) {
          ctx.save();
          ctx.globalAlpha = Math.min(1, story.overlayOpacity + 0.25);
          ctx.strokeStyle = story.tint;
          ctx.fillStyle = story.tint;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';

          for (const shape of shapes) {
            if (shape.pageIndex !== story.pageIndex || !isStructural(shape)) continue;
            switch (shape.type) {
              case 'beam':
              case 'wall': {
                const a = tp(shape.geometry.start);
                const b = tp(shape.geometry.end);
                ctx.lineWidth = (shape.type === 'wall' ? 3 : 2) * px;
                ctx.setLineDash(shape.type === 'wall' ? [] : [6 * px, 3 * px]);
                ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                break;
              }
              case 'portalFrame': {
                const a = tp(shape.geometry.start);
                const b = tp(shape.geometry.end);
                ctx.lineWidth = 2 * px;
                ctx.setLineDash([2 * px, 3 * px]);
                ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                break;
              }
              case 'slab': {
                const pts = shape.geometry.points.map(tp);
                if (pts.length < 3) break;
                ctx.lineWidth = 1.5 * px;
                ctx.setLineDash([8 * px, 4 * px]);
                ctx.beginPath();
                pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
                ctx.closePath();
                ctx.save(); ctx.globalAlpha *= 0.15; ctx.fill(); ctx.restore();
                ctx.stroke();
                break;
              }
              case 'column': {
                const g = shape.geometry;
                const c = tp({ x: g.x + g.width / 2, y: g.y + g.depth / 2 });
                const cw = Math.max(g.width * s, 4 * px);
                const cd = Math.max(g.depth * s, 4 * px);
                ctx.save();
                ctx.translate(c.x, c.y);
                ctx.rotate(rot + ((g.rotation || 0) * Math.PI) / 180);
                ctx.lineWidth = 1.5 * px;
                ctx.setLineDash([]);
                ctx.strokeRect(-cw / 2, -cd / 2, cw, cd);
                ctx.restore();
                break;
              }
              default:
                break;
            }
          }
          ctx.restore();
        }

        // ---- boundary points + vertical links -----------------------------
        if (showLinks) {
          const ghostNodes = nodesOfStory(shapes, story, pages);
          const pairs = pairNodes(baseNodes, ghostNodes, toleranceMm);
          const linked = new Set(pairs.map((p) => p.b.id));

          ctx.save();
          ctx.lineWidth = 1.5 * px;
          for (const n of ghostNodes) {
            const p = tp(n.page);
            ctx.beginPath();
            if (linked.has(n.id)) {
              ctx.strokeStyle = story.tint;
              ctx.setLineDash([]);
              ctx.arc(p.x, p.y, 4 * px, 0, Math.PI * 2);
            } else {
              ctx.strokeStyle = '#f97316';
              ctx.setLineDash([2 * px, 2 * px]);
              ctx.arc(p.x, p.y, 6 * px, 0, Math.PI * 2);
            }
            ctx.stroke();
          }
          ctx.setLineDash([]);
          ctx.strokeStyle = '#16a34a';
          ctx.lineWidth = 2 * px;
          for (const pair of pairs) {
            ctx.beginPath();
            ctx.arc(pair.a.page.x, pair.a.page.y, 9 * px, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();
        }
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [stories, showLinks, toleranceMm, shapes, pages, currentPage, displayScale, resizeVersion]);

  return (
    <canvas
      ref={ref}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 8 }}
    />
  );
}

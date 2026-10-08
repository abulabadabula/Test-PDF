// src/features/stories/storyModel.ts
//
// Assembles a 3D model description from all stories: every node gets
// (x, y) from the common engineering frame and z from its story elevation,
// level elements are exported in mm, and each vertical link becomes a column.

import type { RootState } from '@/app/store';
import { frameOf, pageToFrame, type XY } from '@/core/coordinate/storyTransform';
import { isStructural } from './storyGeometry';
import { summarizeLevels } from './storyLinks';

export function buildStoryModel(state: RootState) {
  const { stories, linkToleranceMm } = state.story;
  const pages = state.pageCoordinate.pages;
  const shapes = state.drawing.shapes;
  const byPage = new Map(stories.map((s) => [s.pageIndex, s]));

  const toMm = (p: XY, pageIndex: number): XY => {
    const st = byPage.get(pageIndex);
    return pageToFrame(p, frameOf(pages, pageIndex, st?.adjust));
  };

  const nodes: object[] = [];
  const elements: object[] = [];
  let skipped = 0;

  for (const shape of shapes) {
    const story = byPage.get(shape.pageIndex);
    if (!isStructural(shape)) continue;
    if (!story) { skipped += 1; continue; }

    const z = story.elevationMm;
    const g = shape.geometry as any;
    const common = { id: shape.id, type: shape.type, story: story.name, z, label: shape.label, properties: shape.properties };

    switch (shape.type) {
      case 'node': {
        const p = toMm({ x: g.x, y: g.y }, shape.pageIndex);
        nodes.push({ id: shape.id, story: story.name, x: p.x, y: p.y, z, constraints: (shape as any).constraints });
        break;
      }
      case 'column':
        elements.push({ ...common, center: toMm({ x: g.x + g.width / 2, y: g.y + g.depth / 2 }, shape.pageIndex) });
        break;
      case 'beam':
      case 'wall':
      case 'portalFrame':
        elements.push({ ...common, start: toMm(g.start, shape.pageIndex), end: toMm(g.end, shape.pageIndex) });
        break;
      case 'slab':
        elements.push({ ...common, boundary: (g.points as XY[]).map((p) => toMm(p, shape.pageIndex)) });
        break;
    }
  }

  const verticalMembers = summarizeLevels(shapes, stories, pages, linkToleranceMm).flatMap((lv) =>
    lv.links.map((l) => ({
      type: 'column',
      lowerNodeId: l.lower.id,
      upperNodeId: l.upper.id,
      lowerStory: lv.lowerStory.name,
      upperStory: lv.upperStory.name,
      x: l.lower.mm.x,
      y: l.lower.mm.y,
      z1: lv.lowerStory.elevationMm,
      z2: lv.upperStory.elevationMm,
      length: lv.upperStory.elevationMm - lv.lowerStory.elevationMm,
    })),
  );

  return {
    meta: {
      units: 'mm',
      note: 'x,y are in the common engineering frame (page origin + drawing scale + level adjustment); z = story elevation.',
      linkToleranceMm,
      skippedElementsWithoutStory: skipped,
      exportedAt: new Date().toISOString(),
    },
    stories: [...stories].sort((a, b) => a.elevationMm - b.elevationMm).map((s) => ({
      name: s.name, page: s.pageIndex, elevationMm: s.elevationMm,
    })),
    nodes,
    elements,
    verticalMembers,
  };
}

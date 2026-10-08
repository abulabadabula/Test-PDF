import type { RootState } from '@/app/store';
import {
  frameForStory,
  pageToFrame,
  sourcePageForStory,
  type XY,
} from '@/core/coordinate/storyTransform';
import { isStructural } from './storyGeometry';
import { summarizeLevels } from './storyLinks';

export function buildStoryModel(state: RootState) {
  const {
    stories,
    linkToleranceMm,
  } = state.story;

  const pageSystems = state.pageCoordinate.pages;
  const sheetSystems = state.pageCoordinate.sheets;
  const planSheets = state.planSheet.sheets;
  const shapes = state.drawing.shapes;

  const nodes: object[] = [];
  const elements: object[] = [];
  let skipped = 0;

  for (const story of stories) {
    const sourcePage = sourcePageForStory(
      story,
      planSheets,
    );

    const frame = frameForStory(
      pageSystems,
      sheetSystems,
      story,
      planSheets,
    );

    for (const shape of shapes) {
      if (!isStructural(shape)) continue;
      if (shape.pageIndex !== sourcePage) continue;

      if (
        shape.sheetId
          ? shape.sheetId !== story.sheetId
          : !story.sheetId.startsWith('legacy-page-')
      ) {
        continue;
      }

      const z = story.elevationMm;
      const geometry = shape.geometry as any;

      const common = {
        id: shape.id,
        type: shape.type,
        story: story.name,
        storySheetId: story.sheetId,
        sourcePage,
        z,
        label: shape.label,
        properties: shape.properties,
      };

      switch (shape.type) {
        case 'node': {
          const point = pageToFrame(
            {
              x: geometry.x,
              y: geometry.y,
            },
            frame,
          );

          nodes.push({
            id: shape.id,
            story: story.name,
            storySheetId: story.sheetId,
            sourcePage,
            x: point.x,
            y: point.y,
            z,
            constraints: (shape as any).constraints,
          });
          break;
        }

        case 'column':
          elements.push({
            ...common,
            center: pageToFrame(
              {
                x: geometry.x + geometry.width / 2,
                y: geometry.y + geometry.depth / 2,
              },
              frame,
            ),
          });
          break;

        case 'beam':
        case 'wall':
        case 'portalFrame':
          elements.push({
            ...common,
            start: pageToFrame(
              geometry.start,
              frame,
            ),
            end: pageToFrame(
              geometry.end,
              frame,
            ),
          });
          break;

        case 'slab':
          elements.push({
            ...common,
            boundary: (geometry.points as XY[]).map(
              (point) => pageToFrame(point, frame),
            ),
          });
          break;
      }
    }
  }

  const verticalMembers = summarizeLevels(
    shapes,
    stories,
    pageSystems,
    sheetSystems,
    planSheets,
    linkToleranceMm,
  ).flatMap((level) =>
    level.links.map((link) => ({
      type: 'column',
      lowerNodeId: link.lower.id,
      upperNodeId: link.upper.id,
      lowerStory: level.lowerStory.name,
      upperStory: level.upperStory.name,
      lowerSheetId: level.lowerStory.sheetId,
      upperSheetId: level.upperStory.sheetId,
      x: link.lower.mm.x,
      y: link.lower.mm.y,
      z1: level.lowerStory.elevationMm,
      z2: level.upperStory.elevationMm,
      length:
        level.upperStory.elevationMm -
        level.lowerStory.elevationMm,
    })),
  );

  return {
    meta: {
      units: 'mm',
      note:
        'x,y are in the common engineering frame derived from the Plan Sheet coordinate system and Story adjustment.',
      linkToleranceMm,
      skippedElementsWithoutStory: skipped,
      exportedAt: new Date().toISOString(),
    },
    stories: [...stories]
      .sort((a, b) => a.elevationMm - b.elevationMm)
      .map((story) => ({
        name: story.name,
        sheetId: story.sheetId,
        page: sourcePageForStory(
          story,
          planSheets,
        ),
        elevationMm: story.elevationMm,
      })),
    nodes,
    elements,
    verticalMembers,
  };
}

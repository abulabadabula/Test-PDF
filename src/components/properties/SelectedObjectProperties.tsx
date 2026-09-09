import React, { useMemo } from 'react';

import { useAppSelector } from '@/app/store/hooks';
import type {
  BeamElement,
  ColumnElement,
  NodeElement,
  PortalFrameElement,
  SlabElement,
  StructuralElement,
  WallElement,
} from '@/features/drawing/elements/elementTypes';

import {
  pagePtToRealMm,
} from '@/core/coordinate/engineeringScale';


// ============================================================================
// TYPES
// ============================================================================

interface PropertyRowProps {
  label: string;
  value?: React.ReactNode;
  unit?: string;
  mono?: boolean;
}

interface PropertySectionProps {
  title: string;
  children: React.ReactNode;
}


// ============================================================================
// COMMON UI COMPONENTS
// ============================================================================

function PropertySection({
  title,
  children,
}: PropertySectionProps) {
  return (
    <section className="border-b border-gray-100 px-4 py-3">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
        {title}
      </div>

      <div className="space-y-0.5">
        {children}
      </div>
    </section>
  );
}


function PropertyRow({
  label,
  value,
  unit,
  mono = false,
}: PropertyRowProps) {
  const displayValue =
    value === undefined ||
    value === null ||
    value === ''
      ? '—'
      : value;

  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="shrink-0 text-[11px] text-gray-500">
        {label}
      </span>

      <span
        className={[
          'min-w-0 truncate text-right text-[11px] text-gray-800',
          mono ? 'font-mono' : '',
        ].join(' ')}
        title={typeof displayValue === 'string' ? displayValue : undefined}
      >
        {displayValue}
        {unit && displayValue !== '—' ? ` ${unit}` : ''}
      </span>
    </div>
  );
}


function EmptyValue({
  children = '—',
}: {
  children?: React.ReactNode;
}) {
  return (
    <span className="text-[11px] text-gray-400">
      {children}
    </span>
  );
}


// ============================================================================
// FORMAT HELPERS
// ============================================================================

function formatNumber(
  value: number | undefined,
  decimals = 1,
): string {
  if (
    value === undefined ||
    value === null ||
    !Number.isFinite(value)
  ) {
    return '—';
  }

  return value.toFixed(decimals);
}


function formatId(
  value: string | number | undefined,
): string {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return '—';
  }

  return String(value);
}


function getElementTypeLabel(
  type: StructuralElement['type'],
): string {
  switch (type) {
    case 'node':
      return 'Node';

    case 'column':
      return 'Column';

    case 'beam':
      return 'Beam';

    case 'wall':
      return 'Wall';

    case 'slab':
      return 'Slab';

    case 'portalFrame':
      return 'Portal Frame';

    default:
      return type;
  }
}


// ============================================================================
// GEOMETRY HELPERS
// ============================================================================

function getLineLengthPagePt(
  start: { x: number; y: number },
  end: { x: number; y: number },
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  return Math.sqrt(
    dx * dx + dy * dy,
  );
}


function pagePtLengthToMm(
  pageLength: number,
  scaleNumerator: number,
  scaleDenominator: number,
): number {
  return pagePtToRealMm(
    pageLength,
    scaleNumerator,
    scaleDenominator,
  );
}


// ============================================================================
// LOAD PLACEHOLDER
// ============================================================================

function LoadsPlaceholder() {
  return (
    <PropertySection title="Loads">
      <div className="space-y-1">
        <PropertyRow
          label="Point Load"
          value={<EmptyValue>No loads</EmptyValue>}
        />

        <PropertyRow
          label="Distributed Load"
          value={<EmptyValue>No loads</EmptyValue>}
        />

        <PropertyRow
          label="Moment"
          value={<EmptyValue>No loads</EmptyValue>}
        />
      </div>

      <div className="mt-2 rounded bg-gray-50 px-2 py-2 text-[10px] leading-4 text-gray-400">
        Load assignment will be added in the structural analysis module.
      </div>
    </PropertySection>
  );
}


// ============================================================================
// NODE
// ============================================================================

function NodeProperties({
  element,
  scaleNumerator,
  scaleDenominator,
}: {
  element: NodeElement;
  scaleNumerator: number;
  scaleDenominator: number;
}) {
  const xMm = pagePtToRealMm(
    element.geometry.x,
    scaleNumerator,
    scaleDenominator,
  );

  const yMm = pagePtToRealMm(
    element.geometry.y,
    scaleNumerator,
    scaleDenominator,
  );

  const constraints = element.constraints;

  return (
    <>
      <PropertySection title="Node">
        <PropertyRow
          label="Node Number"
          value={element.label}
          mono
        />

        <PropertyRow
          label="ID"
          value={element.id}
          mono
        />
      </PropertySection>

      <PropertySection title="Coordinates">
        <PropertyRow
          label="X"
          value={formatNumber(xMm, 1)}
          unit="mm"
          mono
        />

        <PropertyRow
          label="Y"
          value={formatNumber(yMm, 1)}
          unit="mm"
          mono
        />

        <PropertyRow
          label="Drawing Scale"
          value={`1:${scaleDenominator}`}
          mono
        />
      </PropertySection>

      <PropertySection title="Constraints">
        <PropertyRow
          label="UX"
          value={
            constraints?.ux === true
              ? 'Fixed'
              : constraints?.ux === false
                ? 'Free'
                : 'Free'
          }
        />

        <PropertyRow
          label="UY"
          value={
            constraints?.uy === true
              ? 'Fixed'
              : constraints?.uy === false
                ? 'Free'
                : 'Free'
          }
        />

        <PropertyRow
          label="UZ"
          value={
            constraints?.uz === true
              ? 'Fixed'
              : constraints?.uz === false
                ? 'Free'
                : 'Free'
          }
        />

        <PropertyRow
          label="RX"
          value={
            constraints?.rx === true
              ? 'Fixed'
              : constraints?.rx === false
                ? 'Free'
                : 'Free'
          }
        />

        <PropertyRow
          label="RY"
          value={
            constraints?.ry === true
              ? 'Fixed'
              : constraints?.ry === false
                ? 'Free'
                : 'Free'
          }
        />

        <PropertyRow
          label="RZ"
          value={
            constraints?.rz === true
              ? 'Fixed'
              : constraints?.rz === false
                ? 'Free'
                : 'Free'
          }
        />
      </PropertySection>

      <PropertySection title="Connectivity">
        <div className="text-[11px] text-gray-400">
          Connected members will be displayed here.
        </div>
      </PropertySection>
    </>
  );
}


// ============================================================================
// COLUMN
// ============================================================================

function ColumnProperties({
  element,
  scaleNumerator,
  scaleDenominator,
}: {
  element: ColumnElement;
  scaleNumerator: number;
  scaleDenominator: number;
}) {
  const widthMm = pagePtToRealMm(
    element.geometry.width,
    scaleNumerator,
    scaleDenominator,
  );

  const depthMm = pagePtToRealMm(
    element.geometry.depth,
    scaleNumerator,
    scaleDenominator,
  );

  return (
    <>
      <PropertySection title="Column">
        <PropertyRow
          label="Column Number"
          value={element.label}
          mono
        />

        <PropertyRow
          label="ID"
          value={element.id}
          mono
        />

        <PropertyRow
          label="Node"
          value={element.properties.nodeId}
          mono
        />
      </PropertySection>

      <PropertySection title="Geometry">
        <PropertyRow
          label="Width"
          value={formatNumber(widthMm)}
          unit="mm"
          mono
        />

        <PropertyRow
          label="Depth"
          value={formatNumber(depthMm)}
          unit="mm"
          mono
        />

        <PropertyRow
          label="Rotation"
          value={formatNumber(element.geometry.rotation, 1)}
          unit="°"
          mono
        />
      </PropertySection>

      <PropertySection title="Section">
        <PropertyRow
          label="Section"
          value={element.properties.section}
        />
      </PropertySection>

      <PropertySection title="Material">
        <PropertyRow
          label="Material"
          value={element.properties.material}
        />
      </PropertySection>

      <LoadsPlaceholder />
    </>
  );
}


// ============================================================================
// BEAM
// ============================================================================

function BeamProperties({
  element,
  scaleNumerator,
  scaleDenominator,
}: {
  element: BeamElement;
  scaleNumerator: number;
  scaleDenominator: number;
}) {
  const lengthPagePt = getLineLengthPagePt(
    element.geometry.start,
    element.geometry.end,
  );

  const lengthMm = pagePtLengthToMm(
    lengthPagePt,
    scaleNumerator,
    scaleDenominator,
  );

  const widthMm = pagePtToRealMm(
    element.geometry.width,
    scaleNumerator,
    scaleDenominator,
  );

  const depthMm = pagePtToRealMm(
    element.geometry.depth,
    scaleNumerator,
    scaleDenominator,
  );

  return (
    <>
      <PropertySection title="Beam">
        <PropertyRow
          label="Beam Number"
          value={element.label}
          mono
        />

        <PropertyRow
          label="ID"
          value={element.id}
          mono
        />

        <PropertyRow
          label="Start Node"
          value={element.properties.startNodeId}
          mono
        />

        <PropertyRow
          label="End Node"
          value={element.properties.endNodeId}
          mono
        />
      </PropertySection>

      <PropertySection title="Geometry">
        <PropertyRow
          label="Length"
          value={formatNumber(lengthMm)}
          unit="mm"
          mono
        />

        <PropertyRow
          label="Width"
          value={formatNumber(widthMm)}
          unit="mm"
          mono
        />

        <PropertyRow
          label="Depth"
          value={formatNumber(depthMm)}
          unit="mm"
          mono
        />
      </PropertySection>

      <PropertySection title="Section">
        <PropertyRow
          label="Section"
          value={element.properties.section}
        />
      </PropertySection>

      <PropertySection title="Material">
        <PropertyRow
          label="Material"
          value={element.properties.material}
        />
      </PropertySection>

      <LoadsPlaceholder />
    </>
  );
}


// ============================================================================
// WALL
// ============================================================================

function WallProperties({
  element,
  scaleNumerator,
  scaleDenominator,
}: {
  element: WallElement;
  scaleNumerator: number;
  scaleDenominator: number;
}) {
  const lengthPagePt = getLineLengthPagePt(
    element.geometry.start,
    element.geometry.end,
  );

  const lengthMm = pagePtLengthToMm(
    lengthPagePt,
    scaleNumerator,
    scaleDenominator,
  );

  const thicknessMm = pagePtToRealMm(
    element.geometry.thickness,
    scaleNumerator,
    scaleDenominator,
  );

  return (
    <>
      <PropertySection title="Wall">
        <PropertyRow
          label="Wall Number"
          value={element.label}
          mono
        />

        <PropertyRow
          label="ID"
          value={element.id}
          mono
        />

        <PropertyRow
          label="Start Node"
          value={element.properties.startNodeId}
          mono
        />

        <PropertyRow
          label="End Node"
          value={element.properties.endNodeId}
          mono
        />
      </PropertySection>

      <PropertySection title="Geometry">
        <PropertyRow
          label="Length"
          value={formatNumber(lengthMm)}
          unit="mm"
          mono
        />

        <PropertyRow
          label="Thickness"
          value={formatNumber(thicknessMm)}
          unit="mm"
          mono
        />
      </PropertySection>

      <PropertySection title="Wall">
        <PropertyRow
          label="Wall Type"
          value={element.properties.wallType}
        />
      </PropertySection>

      <PropertySection title="Material">
        <PropertyRow
          label="Material"
          value={element.properties.material}
        />
      </PropertySection>

      <LoadsPlaceholder />
    </>
  );
}


// ============================================================================
// SLAB
// ============================================================================

function SlabProperties({
  element,
}: {
  element: SlabElement;
}) {
  return (
    <>
      <PropertySection title="Slab">
        <PropertyRow
          label="Slab Number"
          value={element.label}
          mono
        />

        <PropertyRow
          label="ID"
          value={element.id}
          mono
        />

        <PropertyRow
          label="Level"
          value={element.properties.level}
        />
      </PropertySection>

      <PropertySection title="Geometry">
        <PropertyRow
          label="Vertices"
          value={element.geometry.points.length}
        />

        <PropertyRow
          label="Thickness"
          value={formatNumber(element.properties.thickness)}
          unit="mm"
          mono
        />
      </PropertySection>

      <PropertySection title="Material">
        <PropertyRow
          label="Material"
          value={element.properties.material}
        />
      </PropertySection>

      <LoadsPlaceholder />
    </>
  );
}


// ============================================================================
// PORTAL FRAME
// ============================================================================

function PortalFrameProperties({
  element,
  scaleNumerator,
  scaleDenominator,
}: {
  element: PortalFrameElement;
  scaleNumerator: number;
  scaleDenominator: number;
}) {
  const widthMm = pagePtToRealMm(
    element.geometry.columnWidth,
    scaleNumerator,
    scaleDenominator,
  );

  const depthMm = pagePtToRealMm(
    element.geometry.columnDepth,
    scaleNumerator,
    scaleDenominator,
  );

  const beamWidthMm = pagePtToRealMm(
    element.geometry.beamWidth,
    scaleNumerator,
    scaleDenominator,
  );

  const beamDepthMm = pagePtToRealMm(
    element.geometry.beamDepth,
    scaleNumerator,
    scaleDenominator,
  );

  const heightMm = pagePtToRealMm(
    element.geometry.height,
    scaleNumerator,
    scaleDenominator,
  );

  const lengthPagePt = getLineLengthPagePt(
    element.geometry.start,
    element.geometry.end,
  );

  const spanMm = pagePtLengthToMm(
    lengthPagePt,
    scaleNumerator,
    scaleDenominator,
  );

  return (
    <>
      <PropertySection title="Portal Frame">
        <PropertyRow
          label="Frame Number"
          value={element.label}
          mono
        />

        <PropertyRow
          label="ID"
          value={element.id}
          mono
        />

        <PropertyRow
          label="Start Node"
          value={element.properties.startNodeId}
          mono
        />

        <PropertyRow
          label="End Node"
          value={element.properties.endNodeId}
          mono
        />
      </PropertySection>

      <PropertySection title="Geometry">
        <PropertyRow
          label="Span"
          value={formatNumber(spanMm)}
          unit="mm"
          mono
        />

        <PropertyRow
          label="Height"
          value={formatNumber(heightMm)}
          unit="mm"
          mono
        />
      </PropertySection>

      <PropertySection title="Column Section">
        <PropertyRow
          label="Width"
          value={formatNumber(widthMm)}
          unit="mm"
          mono
        />

        <PropertyRow
          label="Depth"
          value={formatNumber(depthMm)}
          unit="mm"
          mono
        />
      </PropertySection>

      <PropertySection title="Beam Section">
        <PropertyRow
          label="Width"
          value={formatNumber(beamWidthMm)}
          unit="mm"
          mono
        />

        <PropertyRow
          label="Depth"
          value={formatNumber(beamDepthMm)}
          unit="mm"
          mono
        />
      </PropertySection>

      <PropertySection title="Section">
        <PropertyRow
          label="Section"
          value={element.properties.section}
        />
      </PropertySection>

      <PropertySection title="Material">
        <PropertyRow
          label="Material"
          value={element.properties.material}
        />
      </PropertySection>

      <LoadsPlaceholder />
    </>
  );
}


// ============================================================================
// MULTIPLE SELECTION
// ============================================================================

function MultipleSelectionProperties({
  count,
}: {
  count: number;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="text-sm font-semibold text-gray-800">
          Multiple Selection
        </div>

        <div className="mt-0.5 font-mono text-[11px] text-gray-400">
          {count} objects selected
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="rounded bg-gray-50 px-3 py-3 text-[11px] leading-5 text-gray-500">
          Multiple objects are selected.
          <br />
          Individual properties are not displayed.
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SelectedObjectProperties() {
  const {
    selectedShapeIds,
    shapes,
    activeTool,
    scaleNumerator,
    scaleDenominator,
  } = useAppSelector((state) => ({
    selectedShapeIds: state.drawing.selectedShapeIds,
    shapes: state.drawing.shapes,
    activeTool: state.drawing.activeTool,
    scaleNumerator: state.drawing.scaleNumerator,
    scaleDenominator: state.drawing.scaleDenominator,
  }));

  const selectedElements = useMemo(() => {
    if (selectedShapeIds.length === 0) {
      return [];
    }

    const selectedSet = new Set(
      selectedShapeIds,
    );

    return shapes.filter(
      (shape) =>
        selectedSet.has(shape.id) &&
        'geometry' in shape,
    ) as StructuralElement[];
  }, [
    selectedShapeIds,
    shapes,
  ]);

  // --------------------------------------------------------------------------
  // Select tool is not active.
  //
  // PageSidebar will normally show PDF information in this case.
  // --------------------------------------------------------------------------

  if (activeTool !== 'select') {
    return null;
  }

  // --------------------------------------------------------------------------
  // Nothing selected.
  // --------------------------------------------------------------------------

  if (selectedElements.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-gray-100 px-4 py-3">
          <div className="text-sm font-semibold text-gray-800">
            Properties
          </div>

          <div className="mt-0.5 text-[11px] text-gray-400">
            No object selected
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <div>
            <div className="text-sm font-medium text-gray-600">
              Select an object
            </div>

            <div className="mt-1 text-[11px] leading-4 text-gray-400">
              Click a structural object on the PDF canvas
              or in the TreeView.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Multiple selection.
  // --------------------------------------------------------------------------

  if (selectedElements.length > 1) {
    return (
      <MultipleSelectionProperties
        count={selectedElements.length}
      />
    );
  }

  // --------------------------------------------------------------------------
  // Single selection.
  // --------------------------------------------------------------------------

  const element = selectedElements[0];

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-800">
            {getElementTypeLabel(element.type)}
          </div>

          <div className="mt-0.5 truncate font-mono text-[10px] text-gray-400">
            {element.label || element.id}
          </div>
        </div>

        <div className="ml-2 shrink-0 rounded bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-600">
          SELECTED
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {element.type === 'node' && (
          <NodeProperties
            element={element}
            scaleNumerator={scaleNumerator}
            scaleDenominator={scaleDenominator}
          />
        )}

        {element.type === 'column' && (
          <ColumnProperties
            element={element}
            scaleNumerator={scaleNumerator}
            scaleDenominator={scaleDenominator}
          />
        )}

        {element.type === 'beam' && (
          <BeamProperties
            element={element}
            scaleNumerator={scaleNumerator}
            scaleDenominator={scaleDenominator}
          />
        )}

        {element.type === 'wall' && (
          <WallProperties
            element={element}
            scaleNumerator={scaleNumerator}
            scaleDenominator={scaleDenominator}
          />
        )}

        {element.type === 'slab' && (
          <SlabProperties
            element={element}
          />
        )}

        {element.type === 'portalFrame' && (
          <PortalFrameProperties
            element={element}
            scaleNumerator={scaleNumerator}
            scaleDenominator={scaleDenominator}
          />
        )}
      </div>
    </div>
  );
}

export default SelectedObjectProperties;
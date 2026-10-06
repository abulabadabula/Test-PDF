export type SectionType =
  | 'Rectangular'
  | 'Circular'
  | 'Circular Tube'
  | 'Square Tube'
  | 'H-Section'
  | 'PFC'
  | 'L-Section'
  | 'Custom';

export interface SectionDimensionField {
  key: string;
  label: string;
  defaultValue: number;
}

export interface SectionGeometricProperties {
  area: number;
  Ix: number;
  Iy: number;
}

export type SectionDimensions = Record<string, number>;

export function sectionTypeLabel(type: SectionType): string {
  switch (type) {
    case 'Rectangular':
      return 'Rectangular';
    case 'Circular':
      return 'Circular';
    case 'Circular Tube':
      return 'Circular Tube (CHS)';
    case 'Square Tube':
      return 'Square Tube (SHS)';
    case 'H-Section':
      return 'H-Section';
    case 'PFC':
      return 'PFC';
    case 'L-Section':
      return 'L-Section';
    case 'Custom':
      return 'Custom';
    default:
      return type;
  }
}

export function sectionDimensionLabel(key: string): string {
  const labels: Record<string, string> = {
    width: 'Width',
    height: 'Height',
    diameter: 'Diameter',
    outerDiameter: 'Outer Diameter',
    thickness: 'Wall Thickness',
    outsideWidth: 'Outside Width',
    depth: 'Overall Depth',
    flangeWidth: 'Flange Width',
    flangeThickness: 'Flange Thickness',
    webThickness: 'Web Thickness',
    legA: 'Leg A',
    legB: 'Leg B',
    area: 'Area',
    Ix: 'Ix',
    Iy: 'Iy',
  };
  return labels[key] || key;
}

export function getSectionDimensionFields(type: SectionType): SectionDimensionField[] {
  switch (type) {
    case 'Rectangular':
      return [
        { key: 'width', label: 'Width (mm)', defaultValue: 200 },
        { key: 'height', label: 'Height (mm)', defaultValue: 300 },
      ];
    case 'Circular':
      return [
        { key: 'diameter', label: 'Diameter (mm)', defaultValue: 300 },
      ];
    case 'Circular Tube':
      return [
        { key: 'outerDiameter', label: 'Outer Diameter (mm)', defaultValue: 168.3 },
        { key: 'thickness', label: 'Wall Thickness (mm)', defaultValue: 6.3 },
      ];
    case 'Square Tube':
      return [
        { key: 'outsideWidth', label: 'Outside Width (mm)', defaultValue: 150 },
        { key: 'thickness', label: 'Wall Thickness (mm)', defaultValue: 6 },
      ];
    case 'H-Section':
      return [
        { key: 'depth', label: 'Overall Depth (mm)', defaultValue: 200 },
        { key: 'flangeWidth', label: 'Flange Width (mm)', defaultValue: 200 },
        { key: 'webThickness', label: 'Web Thickness (mm)', defaultValue: 8 },
        { key: 'flangeThickness', label: 'Flange Thickness (mm)', defaultValue: 12 },
      ];
    case 'PFC':
      return [
        { key: 'depth', label: 'Overall Depth (mm)', defaultValue: 200 },
        { key: 'flangeWidth', label: 'Flange Width (mm)', defaultValue: 75 },
        { key: 'webThickness', label: 'Web Thickness (mm)', defaultValue: 6 },
        { key: 'flangeThickness', label: 'Flange Thickness (mm)', defaultValue: 10 },
      ];
    case 'L-Section':
      return [
        { key: 'legA', label: 'Leg A (mm)', defaultValue: 100 },
        { key: 'legB', label: 'Leg B (mm)', defaultValue: 100 },
        { key: 'thickness', label: 'Thickness (mm)', defaultValue: 10 },
      ];
    case 'Custom':
      return [
        { key: 'area', label: 'Area (mm²)', defaultValue: 60000 },
        { key: 'Ix', label: 'Ix (mm⁴)', defaultValue: 4.5e8 },
        { key: 'Iy', label: 'Iy (mm⁴)', defaultValue: 2.0e8 },
      ];
    default:
      return [];
  }
}

function allPositive(dimensions: SectionDimensions, keys: string[]): boolean {
  return keys.every((key) => Number.isFinite(dimensions[key]) && dimensions[key] > 0);
}

export function calculateSectionProperties(
  type: SectionType,
  dimensions: SectionDimensions,
): SectionGeometricProperties | null {
  switch (type) {
    case 'Rectangular': {
      if (!allPositive(dimensions, ['width', 'height'])) return null;
      const b = dimensions.width;
      const h = dimensions.height;
      return {
        area: b * h,
        Ix: (b * Math.pow(h, 3)) / 12,
        Iy: (h * Math.pow(b, 3)) / 12,
      };
    }

    case 'Circular': {
      if (!allPositive(dimensions, ['diameter'])) return null;
      const d = dimensions.diameter;
      const area = (Math.PI * Math.pow(d, 2)) / 4;
      const inertia = (Math.PI * Math.pow(d, 4)) / 64;
      return { area, Ix: inertia, Iy: inertia };
    }

    case 'Circular Tube': {
      if (!allPositive(dimensions, ['outerDiameter', 'thickness'])) return null;
      const D = dimensions.outerDiameter;
      const t = dimensions.thickness;
      const d = D - 2 * t;
      if (d <= 0) return null;
      return {
        area: (Math.PI / 4) * (Math.pow(D, 2) - Math.pow(d, 2)),
        Ix: (Math.PI / 64) * (Math.pow(D, 4) - Math.pow(d, 4)),
        Iy: (Math.PI / 64) * (Math.pow(D, 4) - Math.pow(d, 4)),
      };
    }

    case 'Square Tube': {
      if (!allPositive(dimensions, ['outsideWidth', 'thickness'])) return null;
      const B = dimensions.outsideWidth;
      const t = dimensions.thickness;
      const b = B - 2 * t;
      if (b <= 0) return null;
      const inertia = (Math.pow(B, 4) - Math.pow(b, 4)) / 12;
      return {
        area: Math.pow(B, 2) - Math.pow(b, 2),
        Ix: inertia,
        Iy: inertia,
      };
    }

    case 'H-Section': {
      if (!allPositive(dimensions, ['depth', 'flangeWidth', 'webThickness', 'flangeThickness'])) return null;
      const h = dimensions.depth;
      const b = dimensions.flangeWidth;
      const tw = dimensions.webThickness;
      const tf = dimensions.flangeThickness;
      const hw = h - 2 * tf;
      if (hw <= 0 || b <= tw) return null;

      const flangeArea = b * tf;
      const webArea = tw * hw;
      const area = 2 * flangeArea + webArea;
      const flangeOffset = h / 2 - tf / 2;
      const Ix =
        2 * (b * Math.pow(tf, 3) / 12 + flangeArea * Math.pow(flangeOffset, 2)) +
        (tw * Math.pow(hw, 3)) / 12;
      const Iy =
        2 * (tf * Math.pow(b, 3)) / 12 +
        (hw * Math.pow(tw, 3)) / 12;

      return { area, Ix, Iy };
    }

    case 'PFC': {
      if (!allPositive(dimensions, ['depth', 'flangeWidth', 'webThickness', 'flangeThickness'])) return null;
      const h = dimensions.depth;
      const b = dimensions.flangeWidth;
      const tw = dimensions.webThickness;
      const tf = dimensions.flangeThickness;
      const flangeWidthEffective = b - tw;
      if (h <= 2 * tf || flangeWidthEffective <= 0) return null;

      const webArea = h * tw;
      const flangeArea = flangeWidthEffective * tf;
      const area = webArea + 2 * flangeArea;
      const flangeCentroidX = tw + flangeWidthEffective / 2;
      const xBar =
        (webArea * (tw / 2) + 2 * flangeArea * flangeCentroidX) / area;

      const Ix =
        (tw * Math.pow(h, 3)) / 12 +
        2 * (
          (flangeWidthEffective * Math.pow(tf, 3)) / 12 +
          flangeArea * Math.pow(h / 2 - tf / 2, 2)
        );

      const Iy =
        (h * Math.pow(tw, 3)) / 12 +
        webArea * Math.pow(tw / 2 - xBar, 2) +
        2 * (
          (tf * Math.pow(flangeWidthEffective, 3)) / 12 +
          flangeArea * Math.pow(flangeCentroidX - xBar, 2)
        );

      return { area, Ix, Iy };
    }

    case 'L-Section': {
      if (!allPositive(dimensions, ['legA', 'legB', 'thickness'])) return null;
      const a = dimensions.legA;
      const b = dimensions.legB;
      const t = dimensions.thickness;
      if (t >= a || t >= b) return null;

      const A1 = a * t;
      const A2 = t * b;
      const Ao = t * t;
      const x1 = a / 2;
      const y1 = t / 2;
      const x2 = t / 2;
      const y2 = b / 2;
      const xo = t / 2;
      const yo = t / 2;
      const area = A1 + A2 - Ao;
      const xBar = (A1 * x1 + A2 * x2 - Ao * xo) / area;
      const yBar = (A1 * y1 + A2 * y2 - Ao * yo) / area;

      const Ix =
        (a * Math.pow(t, 3)) / 12 + A1 * Math.pow(y1 - yBar, 2) +
        (t * Math.pow(b, 3)) / 12 + A2 * Math.pow(y2 - yBar, 2) -
        (Math.pow(t, 4)) / 12 - Ao * Math.pow(yo - yBar, 2);

      const Iy =
        (t * Math.pow(a, 3)) / 12 + A1 * Math.pow(x1 - xBar, 2) +
        (b * Math.pow(t, 3)) / 12 + A2 * Math.pow(x2 - xBar, 2) -
        (Math.pow(t, 4)) / 12 - Ao * Math.pow(xo - xBar, 2);

      return { area, Ix, Iy };
    }

    case 'Custom': {
      if (!allPositive(dimensions, ['area', 'Ix', 'Iy'])) return null;
      return {
        area: dimensions.area,
        Ix: dimensions.Ix,
        Iy: dimensions.Iy,
      };
    }

    default:
      return null;
  }
}

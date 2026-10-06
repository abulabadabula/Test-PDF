import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { nanoid } from 'nanoid';
import {
  calculateSectionProperties,
  type SectionDimensions,
  type SectionType,
} from '@/core/section/sectionGeometry';

export type { SectionType } from '@/core/section/sectionGeometry';

export interface Material {
  id: string;
  name: string;
  type: 'Steel' | 'Concrete' | 'Timber' | 'Custom';
  youngsModulus: number;
  poissonRatio: number;
  density: number;
  source: 'default' | 'user';
  createdAt: string;
}

export interface Section {
  id: string;
  name: string;
  type: SectionType;
  materialId: string;
  area: number;
  Ix: number;
  Iy: number;
  width?: number;
  height?: number;
  dimensions: SectionDimensions;
  source: 'default' | 'user';
  createdAt: string;
}

export interface PropertiesState {
  materials: Material[];
  sections: Section[];
}

const DEFAULT_CREATED_AT = new Date().toISOString();

function makeDefaultSection(
  id: string,
  name: string,
  type: SectionType,
  materialId: string,
  dimensions: SectionDimensions,
): Section {
  const calculated = calculateSectionProperties(type, dimensions);
  if (!calculated) {
    throw new Error('Invalid default section definition: ' + name);
  }

  return {
    id,
    name,
    type,
    materialId,
    ...calculated,
    dimensions,
    ...(type === 'Rectangular'
      ? { width: dimensions.width, height: dimensions.height }
      : {}),
    source: 'default',
    createdAt: DEFAULT_CREATED_AT,
  };
}

const initialMaterials: Material[] = [
  {
    id: 'mat-1',
    name: 'C30 Concrete',
    type: 'Concrete',
    youngsModulus: 30000,
    poissonRatio: 0.2,
    density: 2400,
    source: 'default',
    createdAt: DEFAULT_CREATED_AT,
  },
  {
    id: 'mat-2',
    name: 'Q355 Steel',
    type: 'Steel',
    youngsModulus: 206000,
    poissonRatio: 0.3,
    density: 7850,
    source: 'default',
    createdAt: DEFAULT_CREATED_AT,
  },
];

const initialSections: Section[] = [
  makeDefaultSection('sec-1', '200x300 RC', 'Rectangular', 'mat-1', { width: 200, height: 300 }),
  makeDefaultSection('sec-2', '90x90 RC', 'Rectangular', 'mat-1', { width: 90, height: 90 }),
  makeDefaultSection('sec-3', '90x450 RC', 'Rectangular', 'mat-1', { width: 90, height: 450 }),
  makeDefaultSection('sec-4', 'Ø300 RC', 'Circular', 'mat-1', { diameter: 300 }),
  makeDefaultSection('sec-5', 'CHS 168.3x6.3', 'Circular Tube', 'mat-2', { outerDiameter: 168.3, thickness: 6.3 }),
  makeDefaultSection('sec-6', 'SHS 150x150x6', 'Square Tube', 'mat-2', { outsideWidth: 150, thickness: 6 }),
  makeDefaultSection('sec-7', 'H 200x200x8x12', 'H-Section', 'mat-2', {
    depth: 200,
    flangeWidth: 200,
    webThickness: 8,
    flangeThickness: 12,
  }),
  makeDefaultSection('sec-8', 'PFC 200x75x6x10', 'PFC', 'mat-2', {
    depth: 200,
    flangeWidth: 75,
    webThickness: 6,
    flangeThickness: 10,
  }),
  makeDefaultSection('sec-9', 'L 100x100x10', 'L-Section', 'mat-2', {
    legA: 100,
    legB: 100,
    thickness: 10,
  }),
];

const initialState: PropertiesState = {
  materials: initialMaterials,
  sections: initialSections,
};

export const propertiesSlice = createSlice({
  name: 'properties',
  initialState,
  reducers: {
    addMaterial: (
      state,
      action: PayloadAction<Omit<Material, 'id' | 'createdAt' | 'source'>>,
    ) => {
      state.materials.push({
        ...action.payload,
        id: nanoid(),
        source: 'user',
        createdAt: new Date().toISOString(),
      });
    },
    deleteMaterial: (state, action: PayloadAction<string>) => {
      state.materials = state.materials.filter((m) => m.id !== action.payload);
      state.sections = state.sections.filter((s) => s.materialId !== action.payload);
    },
    addSection: (
      state,
      action: PayloadAction<Omit<Section, 'id' | 'createdAt' | 'source'>>,
    ) => {
      state.sections.push({
        ...action.payload,
        id: nanoid(),
        source: 'user',
        createdAt: new Date().toISOString(),
      });
    },
    deleteSection: (state, action: PayloadAction<string>) => {
      state.sections = state.sections.filter((s) => s.id !== action.payload);
    },
    updateMaterial: (
      state,
      action: PayloadAction<{
        id: string;
        changes: Partial<Omit<Material, 'id' | 'createdAt' | 'source'>>;
      }>,
    ) => {
      const index = state.materials.findIndex((m) => m.id === action.payload.id);
      if (index !== -1) {
        Object.assign(state.materials[index], action.payload.changes);
      }
    },
    updateSection: (
      state,
      action: PayloadAction<{
        id: string;
        changes: Partial<Omit<Section, 'id' | 'createdAt' | 'source'>>;
      }>,
    ) => {
      const index = state.sections.findIndex((s) => s.id === action.payload.id);
      if (index !== -1) {
        Object.assign(state.sections[index], action.payload.changes);
      }
    },
  },
});

export const {
  addMaterial,
  deleteMaterial,
  updateMaterial,
  addSection,
  deleteSection,
  updateSection,
} = propertiesSlice.actions;

export default propertiesSlice.reducer;

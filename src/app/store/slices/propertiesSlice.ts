import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { nanoid } from 'nanoid';

export interface Material {
  id: string;
  name: string;
  type: 'Steel' | 'Concrete' | 'Timber' | 'Custom';
  youngsModulus: number;
  poissonRatio: number;
  density: number;
  createdAt: string;
}

export interface Section {
  id: string;
  name: string;
  type: 'Rectangular' | 'Circular' | 'I-Section' | 'Custom';
  materialId: string;
  area: number;
  Ix: number;
  Iy: number;
  width?: number;
  height?: number;
  createdAt: string;
}

export interface PropertiesState {
  materials: Material[];
  sections: Section[];
}

const initialState: PropertiesState = {
  materials: [
    { id: 'mat-1', name: 'C30 Concrete', type: 'Concrete', youngsModulus: 30000, poissonRatio: 0.2, density: 2400, createdAt: new Date().toISOString() },
    { id: 'mat-2', name: 'Q355 Steel', type: 'Steel', youngsModulus: 206000, poissonRatio: 0.3, density: 7850, createdAt: new Date().toISOString() },
  ],
  sections: [
    { id: 'sec-1', name: '200x300', type: 'Rectangular', materialId: 'mat-1', area: 60000, Ix: 4.5e8, Iy: 2.0e8, width: 200, height: 300, createdAt: new Date().toISOString() },
  ],
};

export const propertiesSlice = createSlice({
  name: 'properties',
  initialState,
  reducers: {
    addMaterial: (state, action: PayloadAction<Omit<Material, 'id' | 'createdAt'>>) => {
      state.materials.push({ ...action.payload, id: nanoid(), createdAt: new Date().toISOString() });
    },
    deleteMaterial: (state, action: PayloadAction<string>) => {
      state.materials = state.materials.filter(m => m.id !== action.payload);
      // 级联删除使用该材料的截面
      state.sections = state.sections.filter(s => s.materialId !== action.payload);
    },
    addSection: (state, action: PayloadAction<Omit<Section, 'id' | 'createdAt'>>) => {
      state.sections.push({ ...action.payload, id: nanoid(), createdAt: new Date().toISOString() });
    },
    deleteSection: (state, action: PayloadAction<string>) => {
      state.sections = state.sections.filter(s => s.id !== action.payload);
    },
    updateMaterial: (state, action: PayloadAction<{ id: string; changes: Partial<Omit<Material, 'id' | 'createdAt'>> }>) => {
      const index = state.materials.findIndex(m => m.id === action.payload.id);
      if (index !== -1) {
        Object.assign(state.materials[index], action.payload.changes);
      }
    },
    updateSection: (state, action: PayloadAction<{ id: string; changes: Partial<Omit<Section, 'id' | 'createdAt'>> }>) => {
      const index = state.sections.findIndex(s => s.id === action.payload.id);
      if (index !== -1) {
        Object.assign(state.sections[index], action.payload.changes);
      }
    },
  },
});

export const { addMaterial, deleteMaterial, updateMaterial, addSection, deleteSection, updateSection } = propertiesSlice.actions;
export default propertiesSlice.reducer;
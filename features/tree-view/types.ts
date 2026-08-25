import type { Shape } from '@/app/store/slices/drawingSlice';
import type { Material, Section } from '@/app/store/slices/propertiesSlice';

export type TreeNodeType = 'group' | 'shape' | 'material' | 'section';

export interface TreeNodeData{
 id:string;
 type:TreeNodeType;
 label:string;
 code?:string;
 shapeType?:Shape['type'];
 info?:string;
 children?:TreeNodeData[];
 isExpanded?:boolean;
 count?:number;
 shapeData?:Shape;
 materialData?: Material;
 sectionData?: Section;
}

export type SortBy='createdAt'|'type'|'name';

import type { Shape } from '@/app/store/slices/drawingSlice';
export type TreeNodeType='group'|'shape';
export interface TreeNodeData{
 id:string;type:TreeNodeType;label:string;code?:string;shapeType?:Shape['type'];info?:string;children?:TreeNodeData[];isExpanded?:boolean;count?:number;shapeData?:Shape;
}
export type SortBy='createdAt'|'type'|'name';

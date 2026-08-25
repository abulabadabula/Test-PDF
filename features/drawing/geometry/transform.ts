import type { StructuralElement } from '../elements/elementTypes';
import { translateElement } from './geometryUtils';

export function translateStructuralElement(element: StructuralElement, dx: number, dy: number) {
  return translateElement(element, dx, dy);
}

export function translateStructuralElements(elements: StructuralElement[], dx: number, dy: number) {
  return elements.map(e => translateStructuralElement(e, dx, dy));
}

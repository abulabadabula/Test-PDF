import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useAppSelector } from '@/app/store/hooks';
import {
  selectActivePlanSheet,
  selectCropMode,
} from '@/app/store/slices/planSheetSlice';
import { usePdfPage } from './usePdfPage';

interface PdfCanvasProps {
  document: PDFDocumentProxy | null;
}

export function PdfCanvas({ document }: PdfCanvasProps) {
  const currentPage = useAppSelector((state) => state.pdf.currentPage);
  const scale = useAppSelector((state) => state.pdf.scale);
  const rotation = useAppSelector((state) => state.pdf.pageRotation);
  const cropMode = useAppSelector(selectCropMode);
  const activeSheet = useAppSelector(selectActivePlanSheet);

  const crop =
    !cropMode &&
    activeSheet &&
    activeSheet.sourcePage === currentPage
      ? activeSheet.crop
      : null;

  const { canvasRef, viewport } = usePdfPage(
    document,
    currentPage,
    scale,
    rotation,
    crop,
  );

  const width = viewport?.width ?? 600;
  const height = viewport?.height ?? 800;

  return (
    <div
      className="relative bg-white"
      style={{ width, height }}
    >
      {!viewport && (
        <div className="absolute inset-0 animate-pulse bg-muted/40" />
      )}

      <canvas
        ref={canvasRef}
        className="absolute inset-0 block"
        style={{
          width,
          height,
          visibility: viewport ? 'visible' : 'hidden',
        }}
      />
    </div>
  );
}

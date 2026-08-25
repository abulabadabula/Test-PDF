import { useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '@/app/store/hooks';
import { setScale } from '@/app/store/slices/pdfSlice';
import { usePdfDocument } from './usePdfDocument';

export function usePdfFit(containerRef: React.RefObject<HTMLDivElement>) {
  const dispatch = useAppDispatch();
  const { document } = usePdfDocument();
  const currentPage = useAppSelector((state) => state.pdf.currentPage);
  const rotation = useAppSelector((state) => state.pdf.pageRotation);

  const handleFitWidth = useCallback(async () => {
    if (!document || !containerRef.current) return;
    try {
      const page = await document.getPage(currentPage);
      const viewport = page.getViewport({ scale: 1.0, rotation });
      const containerWidth = containerRef.current.clientWidth;
      const newScale = (containerWidth - 20) / viewport.width;
      dispatch(setScale(newScale));
    } catch (err) {
      console.error("Failed to fit width:", err);
    }
  }, [document, containerRef, currentPage, rotation, dispatch]);

  const handleFitPage = useCallback(async () => {
    if (!document || !containerRef.current) return;
    try {
      const page = await document.getPage(currentPage);
      const viewport = page.getViewport({ scale: 1.0, rotation });
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      const scaleX = (containerWidth - 20) / viewport.width;
      const scaleY = (containerHeight - 20) / viewport.height;
      const newScale = Math.min(scaleX, scaleY);
      dispatch(setScale(newScale));
    } catch (err) {
      console.error("Failed to fit page:", err);
    }
  }, [document, containerRef, currentPage, rotation, dispatch]);

  return { handleFitWidth, handleFitPage };
}
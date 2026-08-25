import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';

import { useAppDispatch } from '@/app/store/hooks';
import {
  setLoading,
  setError,
  setTotalPages,
  setFileName,
  closeDocument,
} from '@/app/store/slices/pdfSlice';

import { PdfDocumentManager } from '@/core/document/PdfDocumentManager';

const workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/**
 * Keep the PDF.js worker version exactly aligned with pdfjs-dist.
 *
 * Vite converts the ?url import into a production-safe asset URL.
 */
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

interface PdfContextType {
  document: PDFDocumentProxy | null;
  loadPdf: (source: File | string) => Promise<void>;
  closePdf: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const PdfContext = createContext<
  PdfContextType | undefined
>(undefined);

export function PdfProvider({
  children,
}: {
  children: ReactNode;
}) {
  const dispatch = useAppDispatch();

  const manager = useMemo(
    () => new PdfDocumentManager(),
    []
  );

  const [document, setDocument] =
    useState<PDFDocumentProxy | null>(null);

  const [loading, setLoadingState] =
    useState(false);

  const [error, setErrorState] =
    useState<string | null>(null);

  const loadPdf = useCallback(
    async (source: File | string) => {
      setLoadingState(true);
      setErrorState(null);

      dispatch(setLoading(true));
      dispatch(setError(null));

      try {
        const pdfDoc =
          await manager.load(source);

        const fileName =
          source instanceof File
            ? source.name
            : source.split('/').pop() ||
              'document.pdf';

        setDocument(pdfDoc);

        dispatch(
          setTotalPages(pdfDoc.numPages)
        );

        dispatch(
          setFileName(fileName)
        );

        dispatch(setLoading(false));
      } catch (err) {
        console.error(
          'PDF Load Error:',
          err
        );

        const message =
          err instanceof Error
            ? err.message
            : 'Failed to load PDF document.';

        setErrorState(message);
        setDocument(null);

        dispatch(setError(message));
        dispatch(setLoading(false));
      } finally {
        setLoadingState(false);
      }
    },
    [dispatch, manager]
  );

  const closePdf = useCallback(
    async () => {
      await manager.destroy();

      setDocument(null);
      setErrorState(null);
      setLoadingState(false);

      dispatch(closeDocument());
      dispatch(setLoading(false));
      dispatch(setError(null));
    },
    [dispatch, manager]
  );

  useEffect(() => {
    return () => {
      void manager.destroy();
    };
  }, [manager]);

  const value = useMemo<PdfContextType>(
    () => ({
      document,
      loadPdf,
      closePdf,
      loading,
      error,
    }),
    [
      document,
      loadPdf,
      closePdf,
      loading,
      error,
    ]
  );

  return (
    <PdfContext.Provider value={value}>
      {children}
    </PdfContext.Provider>
  );
}

export function usePdfDocument() {
  const context =
    useContext(PdfContext);

  if (!context) {
    throw new Error(
      'usePdfDocument must be used within PdfProvider'
    );
  }

  return context;
}
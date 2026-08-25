// // client/src/features/pdf-viewer/usePdfDocument.ts
// import { useState, useCallback } from 'react';
// import * as pdfjsLib from 'pdfjs-dist';
// import { useAppDispatch } from '@/app/store/hooks';
// import { setLoading, setError, setTotalPages, setFileName } from '@/app/store/slices/pdfSlice';
// import type { PDFDocumentProxy } from 'pdfjs-dist';

// // 配置 pdfjs worker (使用 CDN)
// pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// export function usePdfDocument() {
//   const dispatch = useAppDispatch();
//   const [loading, setLoadingState] = useState(false);
//   const [error, setErrorState] = useState<string | null>(null);
//   const [document, setDocument] = useState<PDFDocumentProxy | null>(null); // 复杂实例存 React State

//   const loadPdf = useCallback(async (source: File | string) => {
//     setLoadingState(true);
//     dispatch(setLoading(true));
//     setErrorState(null);

//     try {
//       let loadingTask: any;
//       if (source instanceof File) {
//         const arrayBuffer = await source.arrayBuffer();
//         loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
//       } else {
//         loadingTask = pdfjsLib.getDocument(source);
//       }

//       const pdfDoc = await loadingTask.promise;
//       const fileName = source instanceof File ? source.name : source.split('/').pop() || 'document.pdf';

//       // 1. 将纯数据存入 Redux
//       dispatch(setTotalPages(pdfDoc.numPages));
//       dispatch(setFileName(fileName));
      
//       // 2. 将复杂实例存入 React State (不经过 Redux，防止被 Immer 破坏)
//       setDocument(pdfDoc); 

//       setLoadingState(false);
//       dispatch(setLoading(false));
//     } catch (err: any) {
//       console.error('PDF Load Error:', err);
//       const msg = err.message || '加载 PDF 失败';
//       setErrorState(msg);
//       dispatch(setError(msg));
//       setLoadingState(false);
//       dispatch(setLoading(false));
//     }
//   }, [dispatch]);

//   return { document, loadPdf, loading, error };
// }


// 重新导出，保持现有组件的 import 路径完全不变
export { usePdfDocument, PdfProvider } from './PdfContext';
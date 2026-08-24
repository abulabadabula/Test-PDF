import type { PDFDocumentProxy } from 'pdfjs-dist';

export interface PdfViewerProps {
  // 主组件通常依赖 Redux，此处可预留外部覆盖配置
}

export interface PdfCanvasProps {
  // 内部通过 Redux 获取状态，无需外部 props
}

export interface PdfDropZoneProps {
  onFileSelect: (file: File) => void;
  onBlankCanvas?: () => void; // 👈 新增：支持直接进入空白画布模式
}
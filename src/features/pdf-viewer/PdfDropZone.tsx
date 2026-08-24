import { useCallback, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button'; // 👈 确保引入 Button
import { Upload, FilePlus } from 'lucide-react'; // 👈 引入 FilePlus 图标
import type { PdfDropZoneProps } from './types';

export function PdfDropZone({ onFileSelect, onBlankCanvas }: PdfDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-8 bg-gray-50 gap-4">
      <Card
        className={`w-full max-w-md border-2 border-dashed transition-colors cursor-pointer ${
          isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('pdf-file-input')?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Upload className="w-12 h-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-700">拖拽 PDF 到此处或点击上传</p>
          <p className="text-sm text-gray-500 mt-2">支持 .pdf 格式文件</p>
          <input
            id="pdf-file-input"
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </CardContent>
      </Card>

      {/* 👇 新增：空白画布入口按钮 */}
      {onBlankCanvas && (
        <Button
          variant="outline"
          className="w-full max-w-md gap-2"
          onClick={(e) => {
            e.stopPropagation();
            onBlankCanvas();
          }}
        >
          <FilePlus className="w-4 h-4" />
          不使用 PDF，直接创建空白画布进行建模
        </Button>
      )}
    </div>
  );
}
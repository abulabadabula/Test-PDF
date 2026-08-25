import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/app/store/hooks';
import { setCurrentPage } from '@/app/store/slices/pdfSlice';
import { setScaleRatio } from '@/app/store/slices/drawingSlice';
import { setPageScale, setPageUnit } from '@/app/store/slices/pageCoordinateSlice';
import { setCurrentDrawingScale } from '@/core/coordinate/engineeringScale';
import { usePdfDocument } from '@/features/pdf-viewer/usePdfDocument';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  FolderOpen, Layers, Ruler, Info, ChevronRight,
} from 'lucide-react';

export function PageSidebar() {
  const dispatch = useAppDispatch();
  const { fileName, currentPage, totalPages, scale: displayZoom } = useAppSelector((s) => s.pdf);
  const { scaleNumerator, scaleDenominator, scaleUnit } = useAppSelector((s) => s.drawing);
  const { loadPdf } = usePdfDocument();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [scaleNum, setScaleNum] = useState(String(scaleNumerator));
  const [scaleDen, setScaleDen] = useState(String(scaleDenominator));
  const [scaleUnitVal, setScaleUnitVal] = useState<'m' | 'cm' | 'mm'>(scaleUnit as any);

  useEffect(() => setScaleNum(String(scaleNumerator)), [scaleNumerator]);
  useEffect(() => setScaleDen(String(scaleDenominator)), [scaleDenominator]);
  useEffect(() => setScaleUnitVal(scaleUnit as 'm' | 'cm' | 'mm'), [scaleUnit]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await loadPdf(file);
    e.target.value = '';
  }, [loadPdf]);

  const handleApplyScale = useCallback(() => {
    const num = parseFloat(scaleNum);
    const den = parseFloat(scaleDen);
    if (Number.isFinite(num) && Number.isFinite(den) && num > 0 && den > 0) {
      // Keep renderer-only helpers (which cannot access Redux directly) in
      // sync with the Redux source of truth before React redraws the canvas.
      setCurrentDrawingScale(num, den);

      // Update drawing slice state
      dispatch(setScaleRatio({ num, den, unit: scaleUnitVal }));

      // FIX: Sync to pageCoordinate slice for current page
      dispatch(setPageScale({
        pageIndex: currentPage,
        numerator: num,
        denominator: den,
      }));
      dispatch(setPageUnit({
        pageIndex: currentPage,
        unit: scaleUnitVal,
      }));
    }
  }, [scaleNum, scaleDen, scaleUnitVal, currentPage, dispatch]);

  // The PDF page itself is not assumed to be A4. PdfCanvas/PDF.js owns the
  // actual page dimensions. This list intentionally shows page numbers only.
  const pages = Array.from({ length: totalPages }, (_, i) => ({ pageNumber: i + 1 }));

  return (
    <aside
      className="flex flex-col h-full bg-white select-none"
      style={{ width: 280, minWidth: 280 }}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <div>
          <p className="text-sm font-semibold tracking-tight">PDF Canvas</p>
          <p className="text-xs text-gray-500">PDF Annotation Tool</p>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-gray-100">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          size="sm"
          className="w-full gap-2 text-xs h-8"
          onClick={() => fileInputRef.current?.click()}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          Open PDF File
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {fileName && (
          <section className="px-4 py-3 border-b border-gray-100">
            <SectionHeader icon={<Info className="w-3.5 h-3.5" />} title="文件信息" />
            <InfoRow label="File Name" value={fileName} mono />
            <InfoRow label="Total Pages" value={`${totalPages} pages`} mono />
            <InfoRow label="PDF Zoom Scale" value={`${Math.round(displayZoom * 100)}%`} mono />
            <p className="mt-1 text-[11px] leading-4 text-gray-400">
              Screen display zoom, not drawing scale. Not change the length of the components.
            </p>
          </section>
        )}

        {fileName && (
          <section className="px-4 py-3 border-b border-gray-100">
            <SectionHeader icon={<Ruler className="w-3.5 h-3.5" />} title="图纸比例" />

            <div className="text-[11px] text-gray-400 mb-2">
              图纸中的工程比例，例如 1:100。它只负责 PDF 页面长度 ↔ 实际建筑长度的换算。
            </div>

            <div className="flex items-end gap-1.5">
              <div className="flex-1">
                <Label className="text-xs text-gray-500 mb-1 block">图纸</Label>
                <Input
                  type="number"
                  min="0.001"
                  step="any"
                  value={scaleNum}
                  onChange={(e) => setScaleNum(e.target.value)}
                  className="h-7 text-xs font-mono"
                />
              </div>

              <span className="text-xs text-gray-500 pb-1.5">/</span>

              <div className="flex-1">
                <Label className="text-xs text-gray-500 mb-1 block">实际</Label>
                <Input
                  type="number"
                  min="0.001"
                  step="any"
                  value={scaleDen}
                  onChange={(e) => setScaleDen(e.target.value)}
                  className="h-7 text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-500">测量显示单位</span>
              <Select value={scaleUnitVal} onValueChange={(v) => setScaleUnitVal(v as 'm' | 'cm' | 'mm')}>
                <SelectTrigger className="h-7 flex-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="m">m</SelectItem>
                  <SelectItem value="cm">cm</SelectItem>
                  <SelectItem value="mm">mm</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="w-full h-7 text-xs mt-2"
              onClick={handleApplyScale}
            >
              应用比例 1:{scaleDen}
            </Button>
          </section>
        )}

        {totalPages > 0 && (
          <section className="px-4 py-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Layers className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                页面列表
              </span>
              <span className="ml-auto text-xs text-gray-500 font-mono">
                {currentPage}/{totalPages}
              </span>
            </div>

            <div className="space-y-0.5">
              {pages.map((page) => {
                const isActive = page.pageNumber === currentPage;
                return (
                  <button
                    key={page.pageNumber}
                    onClick={() => dispatch(setCurrentPage(page.pageNumber))}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors ${
                      isActive ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded text-xs flex items-center justify-center font-mono shrink-0 ${
                      isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {page.pageNumber}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">第 {page.pageNumber} 页</p>
                      <p className="text-xs text-gray-400">PDF 原始页面尺寸由 PDF.js 决定</p>
                    </div>
                    {isActive && <ChevronRight className="w-3 h-3 text-blue-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {!fileName && (
          <div className="flex flex-col items-center justify-center h-52 px-4 text-center">
            <p className="text-sm font-semibold mb-1">打开 PDF 开始标注</p>
            <p className="text-xs text-gray-500">支持多页图纸 · 设置比例 · 绘制标注</p>
          </div>
        )}
      </div>
    </aside>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <span className="text-gray-500">{icon}</span>
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</span>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className={`text-xs text-right truncate ${mono ? 'font-mono' : ''}`} title={value}>
        {value}
      </span>
    </div>
  );
}
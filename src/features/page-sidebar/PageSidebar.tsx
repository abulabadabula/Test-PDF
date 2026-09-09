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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { FolderOpen, Layers, Ruler, Info, ChevronRight,ArrowLeft
} from 'lucide-react';
import { SelectedObjectProperties,
} from '@/components/properties/SelectedObjectProperties';


export function PageSidebar() {
  const dispatch = useAppDispatch();
  const { fileName, currentPage, totalPages, scale: displayZoom } = useAppSelector((s) => s.pdf);

  // --------------------------------------------------------------------------
  // DRAWING STATE
  // --------------------------------------------------------------------------

  const {
    scaleNumerator,
    scaleDenominator,
    scaleUnit,

    activeTool,
    selectedShapeIds,
  } = useAppSelector(
    (state) => ({
      scaleNumerator: state.drawing.scaleNumerator,
      scaleDenominator: state.drawing.scaleDenominator,
      scaleUnit: state.drawing.scaleUnit,

      activeTool: state.drawing.activeTool,
      selectedShapeIds: state.drawing.selectedShapeIds,
    }),
  );

  // --------------------------------------------------------------------------
  // PDF DOCUMENT
  // --------------------------------------------------------------------------

  const { loadPdf } = usePdfDocument();

  // --------------------------------------------------------------------------
  // LOCAL STATE
  // --------------------------------------------------------------------------

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scaleNum, setScaleNum] = useState(String(scaleNumerator));
  const [scaleDen, setScaleDen] = useState(String(scaleDenominator));
  const [scaleUnitVal, setScaleUnitVal] = useState<'m' | 'cm' | 'mm'>(
      scaleUnit as 'm' | 'cm' | 'mm',
    );

  // --------------------------------------------------------------------------
  // KEEP LOCAL SCALE INPUTS IN SYNC
  // --------------------------------------------------------------------------
  useEffect(() => setScaleNum(String(scaleNumerator)), [scaleNumerator]);
  useEffect(() => setScaleDen(String(scaleDenominator)), [scaleDenominator]);
  useEffect(() => setScaleUnitVal(scaleUnit as 'm' | 'cm' | 'mm'), [scaleUnit]);
  // --------------------------------------------------------------------------
  // FILE OPEN
  // --------------------------------------------------------------------------
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await loadPdf(file);
    e.target.value = '';
  }, [loadPdf]);

  // --------------------------------------------------------------------------
  // APPLY DRAWING SCALE
  // --------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------
  // PAGE LIST
  // --------------------------------------------------------------------------

  /*
   * PDF.js owns the actual PDF page dimensions.
   * We intentionally only display page numbers here.
   */
  const pages = Array.from(
    { length: totalPages,}, (_, index) => ({ pageNumber: index + 1,}),
  );

  // --------------------------------------------------------------------------
  // PROPERTY PANEL VISIBILITY
  // --------------------------------------------------------------------------

  /*
   * The left panel switches from PDF information
   * to object properties only when:
   *
   * 1. Select tool is active
   * 2. At least one object is selected
   *
   * The SelectedObjectProperties component itself
   * handles single / multiple selection.
   */
  const showObjectProperties = activeTool === 'select' && selectedShapeIds.length > 0;

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------

  return (
    <aside
      className="flex h-full select-none flex-col bg-white"
      style={{ width: 280, minWidth: 280,}}
    >
      {/* ================================================================== */}
      {/* HEADER                                                             */}
      {/* ================================================================== */}

      {/* <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        <div>
          <p className="text-sm font-semibold tracking-tight">
            PDF Canvas
          </p>

          <p className="text-xs text-gray-500">
            PDF Annotation Tool
          </p>
        </div>
      </div> */}


      {/* ================================================================== */}
      {/* OPEN PDF                                                           */}
      {/* ================================================================== */}

      {/* <div className="border-b border-gray-100 px-4 py-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        <Button
          size="sm"
          className="h-8 w-full gap-2 text-xs"
          onClick={() =>
            fileInputRef.current?.click()
          }
        >
          <FolderOpen className="h-3.5 w-3.5" />

          Open PDF File
        </Button>
      </div> */}


      {/* ================================================================== */}
      {/* MAIN CONTENT                                                       */}
      {/* ================================================================== */}

      <div className="min-h-0 flex-1 overflow-hidden">

        {showObjectProperties ? (
          /* ================================================================ */
          /* SELECTED OBJECT PROPERTIES                                      */
          /* ================================================================ */

          <div className="flex h-full min-h-0 flex-col">

            <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-50">
                <span className="text-[10px] font-bold text-blue-600"> P </span>
              </div>

              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Object Properties
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              <SelectedObjectProperties />
            </div>
          </div>
        ) : (
          /* ================================================================ */
          /* ORIGINAL PDF INFORMATION PANEL                                  */
          /* ================================================================ */

          <div className="h-full overflow-y-auto">

            {/* ============================================================ */}
            {/* FILE INFORMATION                                              */}
            {/* ============================================================ */}

            {fileName && (
              <section className="border-b border-gray-100 px-4 py-3">
                <SectionHeader icon={ <Info className="h-3.5 w-3.5" />} title="文件信息" />
                <InfoRow label="File Name" value={fileName} mono />
                <InfoRow label="Total Pages" value={`${totalPages} pages`} mono />
                <InfoRow label="PDF Zoom Scale" value={`${Math.round(displayZoom * 100)}%`} mono />

                {/* <p className="mt-1 text-[11px] leading-4 text-gray-400">
                  Screen display zoom, not drawing scale.
                  Not change the length of the components.
                </p> */}
              </section>
            )}

            {/* ============================================================ */}
            {/* DRAWING SCALE                                                 */}
            {/* ============================================================ */}

            {fileName && (
              <section className="border-b border-gray-100 px-4 py-3">
                <SectionHeader icon={ <Ruler className="h-3.5 w-3.5" />} title="图纸比例" />

                {/* <div className="mb-2 text-[11px] text-gray-400">
                  图纸中的工程比例，例如 1:100。
                  它只负责 PDF 页面长度 ↔
                  实际建筑长度的换算。
                </div> */}


                <div className="flex items-end gap-1.5">

                  <div className="flex-1">
                    <Label className="mb-1 block text-xs text-gray-500"> Drawings </Label>

                    <Input
                      type="number"
                      min="0.001"
                      step="any"
                      value={scaleNum}
                      onChange={(event) =>
                        setScaleNum(
                          event.target.value,
                        )
                      }
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                  <span className="pb-1.5 text-xs text-gray-500"> / </span>
                  <div className="flex-1">
                    <Label className="mb-1 block text-xs text-gray-500"> 实际 </Label>
                    <Input type="number"
                      min="0.001"
                      step="any"
                      value={scaleDen}
                      onChange={(event) =>
                        setScaleDen(
                          event.target.value,
                        )
                      }
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                </div>


                {/* ======================================================== */}
                {/* DISPLAY UNIT                                               */}
                {/* ======================================================== */}

                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    测量显示单位
                  </span>

                  <Select
                    value={scaleUnitVal}
                    onValueChange={(value) =>
                      setScaleUnitVal(
                        value as
                          | 'm'
                          | 'cm'
                          | 'mm',
                      )
                    }
                  >
                    <SelectTrigger className="h-7 flex-1 text-xs">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="m">
                        m
                      </SelectItem>

                      <SelectItem value="cm">
                        cm
                      </SelectItem>

                      <SelectItem value="mm">
                        mm
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>


                {/* ======================================================== */}
                {/* APPLY                                                       */}
                {/* ======================================================== */}

                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 h-7 w-full text-xs"
                  onClick={handleApplyScale}
                >
                  应用比例 1:{scaleDen}
                </Button>
              </section>
            )}


            {/* ============================================================ */}
            {/* PAGE LIST                                                     */}
            {/* ============================================================ */}

            {totalPages > 0 && (
              <section className="px-4 py-3">
                <div className="mb-2 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-gray-500" />

                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    页面列表
                  </span>

                  <span className="ml-auto font-mono text-xs text-gray-500">
                    {currentPage}/{totalPages}
                  </span>
                </div>


                <div className="space-y-0.5">
                  {pages.map((page) => {
                    const isActive =
                      page.pageNumber === currentPage;

                    return (
                      <button
                        key={page.pageNumber}
                        onClick={() =>
                          dispatch(
                            setCurrentPage(
                              page.pageNumber,
                            ),
                          )
                        }
                        className={[
                          'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors',

                          isActive
                            ? 'bg-blue-50 text-blue-700'
                            : 'hover:bg-gray-50',
                        ].join(' ')}
                      >

                        <span
                          className={[
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-xs',

                            isActive
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-500',
                          ].join(' ')}
                        >
                          {page.pageNumber}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">
                            第 {page.pageNumber} 页
                          </p>
                          {/* <p className="text-xs text-gray-400">
                            PDF
                          </p> */}
                        </div>

                        {isActive && (
                          <ChevronRight
                            className="h-3 w-3 shrink-0 text-blue-600"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ============================================================ */}
            {/* EMPTY STATE                                                   */}
            {/* ============================================================ */}

            {!fileName && (
              <div className="flex h-52 flex-col items-center justify-center px-4 text-center">
                <p className="mb-1 text-sm font-semibold">
                  打开 PDF 开始标注
                </p>

                <p className="text-xs text-gray-500">
                  支持多页图纸 · 设置比例 · 绘制标注
                </p>
              </div>
            )}

          </div>
        )}
      </div>
    </aside>
  );
}


// ============================================================================
// SECTION HEADER
// ============================================================================
function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <span className="text-gray-500">{icon}</span>
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</span>
    </div>
  );
}
// ============================================================================
// INFORMATION ROW
// ============================================================================
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
import React, { useRef } from 'react';
import { useAppSelector, useAppDispatch } from '@/app/store/hooks';
import { toggleLeftPanel, toggleRightPanel } from '@/app/store/slices/uiSlice';
import { ResizablePanel } from '@/components/layout/ResizablePanel';
import { PageSidebar } from '@/features/page-sidebar/PageSidebar';
import { PdfViewer } from '@/features/pdf-viewer/PdfViewer';
import { InspectorPanel } from './InspectorPanel';
import { ContextToolbar } from './ContextToolbar';

export function EditorWorkspace({
  viewerRef,
}: {
  viewerRef: React.RefObject<{
    handleFitWidth: () => void;
    handleFitPage: () => void;
  }>;
}) {
  const dispatch = useAppDispatch();
  const leftPanelOpen = useAppSelector((state) => state.ui.leftPanelOpen);
  const rightPanelOpen = useAppSelector((state) => state.ui.rightPanelOpen);

  /**
   * Kept for compatibility with the existing component
   * structure.
   *
   * The actual PdfViewer continues to receive the viewerRef
   * supplied by EditorShell.
   */
  const pdfViewerRef = useRef<{
    handleFitWidth: () => void;
    handleFitPage: () => void;
  }>(null);

  return (
    <div data-editor-workspace="true" className="relative flex flex-1 min-w-0 min-h-0 overflow-hidden bg-editor-workspace">
      {/* =====================================================
          LEFT PANEL
          ===================================================== */}
      <ResizablePanel
        isOpen={leftPanelOpen}
        defaultWidth={280}
        minWidth={240}
        maxWidth={400}
        side="left"
        storageKey="test-pdf:left-panel-width"
        onCollapse={() => {
          if (leftPanelOpen) dispatch(toggleLeftPanel());
        }}
        onExpand={() => {
          if (!leftPanelOpen) dispatch(toggleLeftPanel());
        }}
      >
        <PageSidebar />
      </ResizablePanel>

      {/* =====================================================
          MAIN PDF WORKSPACE
          ===================================================== */}
      <div className="relative flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden">
        <ContextToolbar />
        <div className="relative flex-1 min-w-0 min-h-0 overflow-hidden">
          <PdfViewer ref={viewerRef} />
        </div>
      </div>

      {/* =====================================================
          RIGHT PANEL
          ===================================================== */}
      <ResizablePanel
        isOpen={rightPanelOpen}
        defaultWidth={280}
        minWidth={240}
        maxWidth={400}
        side="right"
        storageKey="test-pdf:right-panel-width"
        onCollapse={() => {
          if (rightPanelOpen) dispatch(toggleRightPanel());
        }}
        onExpand={() => {
          if (!rightPanelOpen) dispatch(toggleRightPanel());
        }}
      >
        <InspectorPanel />
      </ResizablePanel>
    </div>
  );
}
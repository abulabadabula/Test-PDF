import { useState } from 'react';
import {
  FileText,
  Undo2,
  Redo2,
  Save,
  Download,
  Wrench,
  PanelLeft,
  PanelLeftClose,
  PanelRight,
  PanelRightClose,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DisplaySettingsDialog } from './DisplaySettingsDialog';
import { MaterialManagerDialog } from './MaterialManagerDialog';
import { SectionManagerDialog } from './SectionManagerDialog';
import { LoadCaseDialog } from './LoadCaseDialog';
import { LoadCombinationDialog } from './LoadCombinationDialog';
import { AssignLoadsDialog } from './AssignLoadsDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { toggleLeftPanel, toggleRightPanel, toggleToolbar } from '@/app/store/slices/uiSlice';
import type { SectionType } from '@/core/section/sectionGeometry';
import type { Material } from '@/app/store/slices/propertiesSlice';
import type { StructuralElement } from '@/features/drawing/elements/elementTypes';

const SECTION_MENU_ITEMS: Array<{ value: SectionType; label: string }> = [
  { value: 'Rectangular', label: 'Rectangular' },
  { value: 'Circular', label: 'Circular' },
  { value: 'Circular Tube', label: 'Circular Tube (CHS)' },
  { value: 'Square Tube', label: 'Square Tube (SHS)' },
  { value: 'H-Section', label: 'H-Section' },
  { value: 'PFC', label: 'PFC' },
  { value: 'L-Section', label: 'L-Section' },
];

const MATERIAL_MENU_ITEMS: Array<{ value: Material['type']; label: string }> = [
  { value: 'Concrete', label: 'Concrete' },
  { value: 'Steel', label: 'Steel' },
  { value: 'Timber', label: 'Timber' },
  { value: 'Custom', label: 'Custom' },
];

export function AppHeader() {
  const dispatch = useAppDispatch();
  const leftPanelOpen = useAppSelector((state) => state.ui.leftPanelOpen);
  const rightPanelOpen = useAppSelector((state) => state.ui.rightPanelOpen);
  const toolbarCollapsed = useAppSelector((state) => state.ui.toolbarCollapsed);
  const selectedElement = useAppSelector((state) => {
    const selectedId = state.drawing.selectedShapeIds[0];
    const shape = state.drawing.shapes.find((item) => item.id === selectedId);
    return shape && 'geometry' in shape ? shape as StructuralElement : null;
  });

  const [isMaterialMenuOpen, setIsMaterialMenuOpen] = useState(false);
  const [isMaterialManagerOpen, setIsMaterialManagerOpen] = useState(false);
  const [materialInitialType, setMaterialInitialType] = useState<Material['type']>('Concrete');
  const [isSectionMenuOpen, setIsSectionMenuOpen] = useState(false);
  const [isSectionManagerOpen, setIsSectionManagerOpen] = useState(false);
  const [sectionInitialType, setSectionInitialType] = useState<SectionType>('Rectangular');
  const [isLoadMenuOpen, setIsLoadMenuOpen] = useState(false);
  const [isLoadCaseDialogOpen, setIsLoadCaseDialogOpen] = useState(false);
  const [isLoadCombinationDialogOpen, setIsLoadCombinationDialogOpen] = useState(false);
  const [isAssignLoadsDialogOpen, setIsAssignLoadsDialogOpen] = useState(false);

  const openMaterialManager = (type: Material['type']) => {
    setMaterialInitialType(type);
    setIsMaterialManagerOpen(true);
    setIsMaterialMenuOpen(false);
  };

  const openSectionManager = (type: SectionType) => {
    setSectionInitialType(type);
    setIsSectionManagerOpen(true);
    setIsSectionMenuOpen(false);
  };

  const openAssignLoads = () => {
    if (!selectedElement) return;
    setIsAssignLoadsDialogOpen(true);
    setIsLoadMenuOpen(false);
  };

  return (
    <>
      <header className="h-12 flex items-center justify-between px-4 bg-editor-toolbar border-b border-border shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-semibold text-base tracking-tight">
            <div className="w-6 h-6 bg-accent rounded flex items-center justify-center text-accent-foreground">
              <FileText className="w-4 h-4" />
            </div>
            <span>PDF Canvas</span>
          </div>

          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            {['File', 'Edit', 'View', 'Tools'].map((item) => (
              <button
                key={item}
                className="px-3 py-1.5 rounded hover:bg-editor-hover hover:text-foreground transition-colors"
              >
                {item}
              </button>
            ))}

            <DropdownMenu open={isMaterialMenuOpen} onOpenChange={setIsMaterialMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  className="px-3 py-1.5 rounded hover:bg-editor-hover hover:text-foreground transition-colors"
                  onPointerEnter={() => setIsMaterialMenuOpen(true)}
                >
                  Material
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48" onPointerLeave={() => setIsMaterialMenuOpen(false)}>
                {MATERIAL_MENU_ITEMS.map((item) => (
                  <DropdownMenuItem key={item.value} onClick={() => openMaterialManager(item.value)}>
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu open={isSectionMenuOpen} onOpenChange={setIsSectionMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  className="px-3 py-1.5 rounded hover:bg-editor-hover hover:text-foreground transition-colors"
                  onPointerEnter={() => setIsSectionMenuOpen(true)}
                >
                  Section
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52" onPointerLeave={() => setIsSectionMenuOpen(false)}>
                {SECTION_MENU_ITEMS.map((item) => (
                  <DropdownMenuItem key={item.value} onClick={() => openSectionManager(item.value)}>
                    {item.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onClick={() => openSectionManager('Custom')}>
                  Custom Properties
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu open={isLoadMenuOpen} onOpenChange={setIsLoadMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  className="px-3 py-1.5 rounded hover:bg-editor-hover hover:text-foreground transition-colors"
                  onPointerEnter={() => setIsLoadMenuOpen(true)}
                >
                  Load
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56" onPointerLeave={() => setIsLoadMenuOpen(false)}>
                <DropdownMenuItem
                  disabled={!selectedElement}
                  onClick={openAssignLoads}
                >
                  Assign Loads{selectedElement ? ' — ' + selectedElement.label : ''}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setIsLoadCaseDialogOpen(true);
                    setIsLoadMenuOpen(false);
                  }}
                >
                  Load Case Definitions
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setIsLoadCombinationDialogOpen(true);
                    setIsLoadMenuOpen(false);
                  }}
                >
                  Load Combination Definitions
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => dispatch(toggleLeftPanel())}
            title={leftPanelOpen ? '收起左侧面板' : '展开左侧面板'}
          >
            {leftPanelOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => dispatch(toggleToolbar())}
            title={toolbarCollapsed ? '显示工具条' : '隐藏工具条'}
          >
            <Wrench className={`w-4 h-4 ${!toolbarCollapsed ? 'opacity-100' : 'opacity-40'}`} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => dispatch(toggleRightPanel())}
            title={rightPanelOpen ? '收起右侧面板' : '展开右侧面板'}
          >
            {rightPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRight className="w-4 h-4" />}
          </Button>

          <DisplaySettingsDialog />

          <Button variant="ghost" size="icon" className="h-8 w-8" title="Undo (Ctrl+Z)">
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Redo (Ctrl+Shift+Z)">
            <Redo2 className="w-4 h-4" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
            <Save className="w-3.5 h-3.5" /> Save
          </Button>
          <Button variant="default" size="sm" className="h-8 gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        </div>
      </header>

      <MaterialManagerDialog
        open={isMaterialManagerOpen}
        onOpenChange={setIsMaterialManagerOpen}
        initialType={materialInitialType}
      />
      <SectionManagerDialog
        open={isSectionManagerOpen}
        onOpenChange={setIsSectionManagerOpen}
        initialType={sectionInitialType}
      />
      <LoadCaseDialog
        open={isLoadCaseDialogOpen}
        onOpenChange={setIsLoadCaseDialogOpen}
      />
      <LoadCombinationDialog
        open={isLoadCombinationDialogOpen}
        onOpenChange={setIsLoadCombinationDialogOpen}
      />
      <AssignLoadsDialog
        open={isAssignLoadsDialogOpen}
        onOpenChange={setIsAssignLoadsDialogOpen}
        element={selectedElement}
      />
    </>
  );
}

import React, { useState } from 'react';
import { 
  FileText, Undo2, Redo2, Save, Download, Wrench,
  PanelLeft, PanelLeftClose, 
  PanelRight, PanelRightClose,
  Box // 引入 Box 图标用于 Define 菜单
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DisplaySettingsDialog } from './DisplaySettingsDialog';
// 替换为新的独立对话框组件
import { MaterialManagerDialog } from './MaterialManagerDialog';
import { SectionManagerDialog } from './SectionManagerDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { toggleLeftPanel, toggleToolbar, toggleRightPanel } from '@/app/store/slices/uiSlice';

export function AppHeader() {
  const dispatch = useAppDispatch();
  const leftPanelOpen = useAppSelector((s) => s.ui.leftPanelOpen);
  const toolbarCollapsed = useAppSelector((s) => s.ui.toolbarCollapsed);
  const rightPanelOpen = useAppSelector((s) => s.ui.rightPanelOpen);
  
  // 管理独立对话框的打开状态
  const [isMaterialDialogOpen, setIsMaterialDialogOpen] = useState(false);
  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
  const [isDefineMenuOpen, setIsDefineMenuOpen] = useState(false);

  const menuItems = ['File', 'Edit', 'View', 'Tools'];

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
            {menuItems.map((item) => (
              <button
                key={item}
                className="px-3 py-1.5 rounded hover:bg-editor-hover hover:text-foreground transition-colors"
              >
                {item}
              </button>
            ))}
            
            {/* 统一的 Define 菜单 */}
            <DropdownMenu open={isDefineMenuOpen} onOpenChange={setIsDefineMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button 
                  className="px-3 py-1.5 rounded hover:bg-editor-hover hover:text-foreground transition-colors flex items-center gap-2"
                  onPointerEnter={() => setIsDefineMenuOpen(true)}
                >
                  <Box className="w-4 h-4" />
                  Define
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48" onPointerLeave={() => setIsDefineMenuOpen(false)}>
                <DropdownMenuItem onClick={() => { setIsMaterialDialogOpen(true); setIsDefineMenuOpen(false); }}>
                  Material
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setIsSectionDialogOpen(true); setIsDefineMenuOpen(false); }}>
                  Section
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
            title={leftPanelOpen ? "收起左侧面板" : "展开左侧面板"}
          >
            {leftPanelOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </Button>

          <Button 
            variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => dispatch(toggleToolbar())} 
            title={toolbarCollapsed ? "显示工具条" : "隐藏工具条"} 
          >
            <Wrench className={`w-4 h-4 ${!toolbarCollapsed ? 'opacity-100' : 'opacity-40'}`} /> 
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => dispatch(toggleRightPanel())}
            title={rightPanelOpen ? "收起右侧面板" : "展开右侧面板"}
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

      {/* 渲染独立的对话框组件 */}
      <MaterialManagerDialog open={isMaterialDialogOpen} onOpenChange={setIsMaterialDialogOpen} />
      <SectionManagerDialog open={isSectionDialogOpen} onOpenChange={setIsSectionDialogOpen} />
    </>
  );
}

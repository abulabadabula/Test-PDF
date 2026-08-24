import React, { useState } from 'react';
import { 
  FileText, Undo2, Redo2, Save, Download, 
  PanelLeft, PanelLeftClose, 
  PanelRight, PanelRightClose // 1. 引入右侧面板图标
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DisplaySettingsDialog } from './DisplaySettingsDialog';
import { MaterialDialog } from './MaterialDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// 2. 引入 Redux hooks 和右侧面板的 action
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { toggleLeftPanel, toggleRightPanel } from '@/app/store/slices/uiSlice';

export function AppHeader() {
  const dispatch = useAppDispatch();
  
  // 3. 读取左右面板的展开状态
  const leftPanelOpen = useAppSelector((state) => state.ui.leftPanelOpen);
  const rightPanelOpen = useAppSelector((state) => state.ui.rightPanelOpen);
  
  const [activeMaterial, setActiveMaterial] = useState<'concrete' | 'steel' | 'timber' | null>(null);
  const [isMaterialMenuOpen, setIsMaterialMenuOpen] = useState(false);

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
            
            <DropdownMenu open={isMaterialMenuOpen} onOpenChange={setIsMaterialMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button 
                  className="px-3 py-1.5 rounded hover:bg-editor-hover hover:text-foreground transition-colors"
                  onPointerEnter={() => setIsMaterialMenuOpen(true)}
                >
                  Material
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40" onPointerLeave={() => setIsMaterialMenuOpen(false)}>
                <DropdownMenuItem onClick={() => { setActiveMaterial('concrete'); setIsMaterialMenuOpen(false); }}>Concrete</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setActiveMaterial('steel'); setIsMaterialMenuOpen(false); }}>Steel</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setActiveMaterial('timber'); setIsMaterialMenuOpen(false); }}>Timber</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>

        <div className="flex items-center gap-1">

          {/* 左侧面板开关 */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => dispatch(toggleLeftPanel())}
            title={leftPanelOpen ? "收起左侧面板" : "展开左侧面板"}
          >
            {leftPanelOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </Button>

          {/* 4. 新增：右侧面板开关按钮（放在右侧功能区的最左边） */}
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

      <MaterialDialog materialType={activeMaterial} onClose={() => setActiveMaterial(null)} />
    </>
  );
}
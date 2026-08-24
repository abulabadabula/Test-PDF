import React, { useState } from 'react';
import { FileText, Undo2, Redo2, Save, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DisplaySettingsDialog } from './DisplaySettingsDialog';
import { MaterialDialog } from './MaterialDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function AppHeader() {
  const [activeMaterial, setActiveMaterial] = useState<'concrete' | 'steel' | 'timber' | null>(null);
  const [isMaterialMenuOpen, setIsMaterialMenuOpen] = useState(false);

  // 传统菜单项列表
  const menuItems = ['File', 'Edit', 'View', 'Tools'];

  return (
    <>
      <header className="h-12 flex items-center justify-between px-4 bg-editor-toolbar border-b border-border shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 font-semibold text-base tracking-tight">
            <div className="w-6 h-6 bg-accent rounded flex items-center justify-center text-accent-foreground">
              <FileText className="w-4 h-4" />
            </div>
            <span>PDF Canvas</span>
          </div>
          
          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            {/* 常规菜单项 */}
            {menuItems.map((item) => (
              <button
                key={item}
                className="px-3 py-1.5 rounded hover:bg-editor-hover hover:text-foreground transition-colors"
              >
                {item}
              </button>
            ))}
            
            {/* Material 菜单：无箭头，支持 Hover 悬停展开，样式与上方完全一致 */}
            <DropdownMenu open={isMaterialMenuOpen} onOpenChange={setIsMaterialMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button 
                  className="px-3 py-1.5 rounded hover:bg-editor-hover hover:text-foreground transition-colors"
                  // 鼠标移入时打开菜单
                  onPointerEnter={() => setIsMaterialMenuOpen(true)}
                >
                  Material
                </button>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent 
                align="start" 
                className="w-40"
                // 鼠标移出菜单区域时关闭（可选，保持传统软件体验）
                onPointerLeave={() => setIsMaterialMenuOpen(false)}
              >
                <DropdownMenuItem onClick={() => { setActiveMaterial('concrete'); setIsMaterialMenuOpen(false); }}>
                  Concrete
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setActiveMaterial('steel'); setIsMaterialMenuOpen(false); }}>
                  Steel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setActiveMaterial('timber'); setIsMaterialMenuOpen(false); }}>
                  Timber
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>

        <div className="flex items-center gap-1">
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

      {/* 渲染材料属性对话框 */}
      <MaterialDialog 
        materialType={activeMaterial} 
        onClose={() => setActiveMaterial(null)} 
      />
    </>
  );
}
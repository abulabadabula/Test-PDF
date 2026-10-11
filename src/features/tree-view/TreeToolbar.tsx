import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { deleteSelected } from '@/app/store/slices/drawingSlice';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Trash2 } from 'lucide-react';
import type { SortBy } from './types';

interface TreeToolbarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortBy: SortBy;
  setSortBy: (s: SortBy) => void;
}

export function TreeToolbar({ searchQuery, setSearchQuery, sortBy, setSortBy }: TreeToolbarProps) {
  const dispatch = useAppDispatch();
  const selectedIds = useAppSelector(state => state.drawing.selectedShapeIds);

  //const handleSelectAll = () => {
    // 简化：全选当前页所有可见图形
    // 实际项目中可能需要遍历树节点
  //};

  const handleBatchDelete = () => {
    if (selectedIds.length > 0) {
      dispatch(deleteSelected());
    }
  };

  return (
    <div className="p-2 border-b space-y-2 bg-gray-50/50">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
        <Input
          placeholder="搜索编号、类型或名称..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="h-7 pl-7 text-xs"
        />
      </div>
      
      <div className="flex items-center gap-1">
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
          <SelectTrigger className="h-7 text-xs flex-1">
            <SelectValue placeholder="排序" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">按创建时间</SelectItem>
            <SelectItem value="type">按类型</SelectItem>
            <SelectItem value="name">按名称</SelectItem>
          </SelectContent>
        </Select>

        {selectedIds.length > 0 && (
          <Button variant="destructive" size="icon" className="h-7 w-7" onClick={handleBatchDelete} title="批量删除">
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

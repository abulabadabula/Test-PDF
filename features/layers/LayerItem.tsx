import { useState, useRef, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/app/store/hooks';
import { setActiveLayer, updateLayer, removeLayer } from '@/app/store/slices/layerSlice';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Lock, Unlock, Trash2, GripVertical } from 'lucide-react';
import type { Layer } from '@/app/store/slices/layerSlice';

interface LayerItemProps {
  layer: Layer;
}

export function LayerItem({ layer }: LayerItemProps) {
  const dispatch = useAppDispatch();
  const activeLayerId = useAppSelector(state => state.layer.activeLayerId);
  const shapesCount = useAppSelector(state => state.drawing.shapes.filter(s => s.layerId === layer.id).length);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(layer.name);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: layer.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleNameSubmit = () => {
    if (editName.trim()) {
      dispatch(updateLayer({ id: layer.id, changes: { name: editName.trim() } }));
    } else {
      setEditName(layer.name);
    }
    setIsEditing(false);
  };

  const isActive = activeLayerId === layer.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
        isActive ? 'bg-primary/10 border border-primary/20' : 'hover:bg-gray-100 border border-transparent'
      }`}
      onClick={() => dispatch(setActiveLayer(layer.id))}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing">
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="w-3 h-3 rounded-full flex-shrink-0 border border-gray-200" style={{ backgroundColor: layer.color }} />

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <Input
            ref={inputRef}
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
            className="h-6 text-xs px-1"
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span 
            className="text-xs font-medium truncate block" 
            onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
          >
            {layer.name}
          </span>
        )}
      </div>

      <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 rounded-full flex-shrink-0">
        {shapesCount}
      </span>

      <div className={`flex items-center gap-0.5 transition-opacity ${isHovered || isActive ? 'opacity-100' : 'opacity-0'}`}>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); dispatch(updateLayer({ id: layer.id, changes: { visible: !layer.visible } })); }}>
          {layer.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 text-gray-400" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); dispatch(updateLayer({ id: layer.id, changes: { locked: !layer.locked } })); }}>
          {layer.locked ? <Lock className="h-3 w-3 text-red-500" /> : <Unlock className="h-3 w-3" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700" onClick={e => { e.stopPropagation(); dispatch(removeLayer(layer.id)); }}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
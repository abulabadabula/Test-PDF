import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { addSection } from '@/app/store/slices/propertiesSlice';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SectionManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SectionManagerDialog({ open, onOpenChange }: SectionManagerDialogProps) {
  const dispatch = useAppDispatch();
  const materials = useAppSelector((s) => s.properties.materials);
  const sections = useAppSelector((s) => s.properties.sections);

  const [secName, setSecName] = useState('');
  const [secType, setSecType] = useState<'Rectangular' | 'Circular' | 'I-Section' | 'Custom'>('Rectangular');
  const [secMatId, setSecMatId] = useState(materials[0]?.id || '');
  const [secWidth, setSecWidth] = useState('200');
  const [secHeight, setSecHeight] = useState('300');

  const handleAddSection = () => {
    if (!secName || !secMatId) return;
    const w = Number(secWidth);
    const h = Number(secHeight);
    dispatch(addSection({
      name: secName, type: secType, materialId: secMatId,
      area: w * h, Ix: (w * Math.pow(h, 3)) / 12, Iy: (h * Math.pow(w, 3)) / 12,
      width: w, height: h,
    }));
    setSecName('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Define Section Properties</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input className="h-8" value={secName} onChange={(e) => setSecName(e.target.value)} placeholder="e.g., 200x300" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={secType} onValueChange={(v: any) => setSecType(v)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Rectangular">Rectangular</SelectItem>
                  <SelectItem value="Circular">Circular</SelectItem>
                  <SelectItem value="I-Section">I-Section</SelectItem>
                  <SelectItem value="Custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Material</Label>
              <Select value={secMatId} onValueChange={setSecMatId}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {materials.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Width (mm)</Label>
              <Input className="h-8" type="number" value={secWidth} onChange={(e) => setSecWidth(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Height (mm)</Label>
              <Input className="h-8" type="number" value={secHeight} onChange={(e) => setSecHeight(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleAddSection} className="w-full h-9">Add Section</Button>

          <div className="mt-4 border rounded-md">
            <div className="p-2 bg-muted font-medium text-xs">Existing Sections</div>
            <div className="max-h-40 overflow-y-auto">
              {sections.length === 0 && (
                <div className="p-2 text-xs text-muted-foreground text-center">No sections defined yet.</div>
              )}
              {sections.map(s => {
                const mat = materials.find(m => m.id === s.materialId);
                return (
                  <div key={s.id} className="p-2 border-b text-xs flex justify-between items-center last:border-0">
                    <span>{s.name} <span className="text-muted-foreground">({s.type})</span></span>
                    <span className="text-muted-foreground">{mat?.name || 'No Material'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
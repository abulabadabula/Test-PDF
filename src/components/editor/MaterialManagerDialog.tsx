import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { addMaterial } from '@/app/store/slices/propertiesSlice';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MaterialManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MaterialManagerDialog({ open, onOpenChange }: MaterialManagerDialogProps) {
  const dispatch = useAppDispatch();
  const materials = useAppSelector((s) => s.properties.materials);

  const [matName, setMatName] = useState('');
  const [matType, setMatType] = useState<'Steel' | 'Concrete' | 'Timber' | 'Custom'>('Concrete');
  const [matE, setMatE] = useState('30000');
  const [matNu, setMatNu] = useState('0.2');
  const [matDensity, setMatDensity] = useState('2400');

  const handleAddMaterial = () => {
    if (!matName) return;
    dispatch(addMaterial({
      name: matName, type: matType,
      youngsModulus: Number(matE), poissonRatio: Number(matNu), density: Number(matDensity),
    }));
    setMatName(''); 
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Define Material Properties</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {/* 减小间距 gap-3 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input className="h-8" value={matName} onChange={(e) => setMatName(e.target.value)} placeholder="e.g., C30 Concrete" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={matType} onValueChange={(v: any) => setMatType(v)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Concrete">Concrete</SelectItem>
                  <SelectItem value="Steel">Steel</SelectItem>
                  <SelectItem value="Timber">Timber</SelectItem>
                  <SelectItem value="Custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Young's Modulus (E)</Label>
              <Input className="h-8" type="number" value={matE} onChange={(e) => setMatE(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Poisson's Ratio (ν)</Label>
              <Input className="h-8" type="number" step="0.01" value={matNu} onChange={(e) => setMatNu(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Density (kg/m³)</Label>
              <Input className="h-8" type="number" value={matDensity} onChange={(e) => setMatDensity(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleAddMaterial} className="w-full h-9">Add Material</Button>
          
          <div className="mt-4 border rounded-md">
            <div className="p-2 bg-muted font-medium text-xs">Existing Materials</div>
            <div className="max-h-40 overflow-y-auto">
              {materials.length === 0 && (
                <div className="p-2 text-xs text-muted-foreground text-center">No materials defined yet.</div>
              )}
              {materials.map(m => (
                <div key={m.id} className="p-2 border-b text-xs flex justify-between items-center last:border-0">
                  <span>{m.name} <span className="text-muted-foreground">({m.type})</span></span>
                  <span className="text-muted-foreground">E={m.youngsModulus}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { addMaterial } from '@/app/store/slices/propertiesSlice';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Material } from '@/app/store/slices/propertiesSlice';

interface MaterialManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialType?: Material['type'];
}

export function MaterialManagerDialog({
  open,
  onOpenChange,
  initialType = 'Concrete',
}: MaterialManagerDialogProps) {
  const dispatch = useAppDispatch();
  const materials = useAppSelector((s) => s.properties.materials);

  const [matName, setMatName] = useState('');
  const [matType, setMatType] = useState<Material['type']>(initialType);
  const [matE, setMatE] = useState('30000');
  const [matNu, setMatNu] = useState('0.2');
  const [matDensity, setMatDensity] = useState('2400');

  useEffect(() => {
    if (!open) return;
    setMatName('');
    setMatType(initialType);
    if (initialType === 'Steel') {
      setMatE('206000');
      setMatNu('0.3');
      setMatDensity('7850');
    } else if (initialType === 'Timber') {
      setMatE('11000');
      setMatNu('0.35');
      setMatDensity('500');
    } else {
      setMatE('30000');
      setMatNu('0.2');
      setMatDensity('2400');
    }
  }, [open, initialType]);

  const handleAddMaterial = () => {
    if (!matName.trim()) return;
    const E = Number(matE);
    const nu = Number(matNu);
    const density = Number(matDensity);
    if (!Number.isFinite(E) || E <= 0 || !Number.isFinite(nu) || nu < 0 || nu > 0.5 || !Number.isFinite(density) || density <= 0) {
      return;
    }

    dispatch(addMaterial({
      name: matName.trim(),
      type: matType,
      youngsModulus: E,
      poissonRatio: nu,
      density,
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input className="h-8" value={matName} onChange={(e) => setMatName(e.target.value)} placeholder="e.g., C30 Concrete" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={matType} onValueChange={(v: Material['type']) => setMatType(v)}>
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
              <Label className="text-xs">Young&apos;s Modulus (E) [MPa]</Label>
              <Input className="h-8" type="number" min="0" value={matE} onChange={(e) => setMatE(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Poisson&apos;s Ratio (ν)</Label>
              <Input className="h-8" type="number" min="0" max="0.5" step="0.01" value={matNu} onChange={(e) => setMatNu(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Density (kg/m³)</Label>
              <Input className="h-8" type="number" min="0" value={matDensity} onChange={(e) => setMatDensity(e.target.value)} />
            </div>
          </div>

          <Button onClick={handleAddMaterial} className="w-full h-9">Add Material</Button>

          <div className="mt-4 border rounded-md">
            <div className="p-2 bg-muted font-medium text-xs">Existing Materials</div>
            <div className="max-h-40 overflow-y-auto">
              {materials.length === 0 && (
                <div className="p-2 text-xs text-muted-foreground text-center">No materials defined yet.</div>
              )}
              {materials.map((m: Material) => (
                <div key={m.id} className="p-2 border-b text-xs flex justify-between items-center last:border-0">
                  <span>{m.name} <span className="text-muted-foreground">({m.type})</span></span>
                  <span className="text-muted-foreground">E={m.youngsModulus} MPa</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

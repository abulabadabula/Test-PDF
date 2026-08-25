import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { deleteMaterial, updateMaterial, deleteSection, updateSection } from '@/app/store/slices/propertiesSlice';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Material, Section } from '@/app/store/slices/propertiesSlice';

interface PropertyEditorDialogProps {
  nodeType: 'material' | 'section';
  data: Material | Section | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PropertyEditorDialog({ nodeType, data, open, onOpenChange }: PropertyEditorDialogProps) {
  const dispatch = useAppDispatch();
  const materials = useAppSelector((s) => s.properties.materials);
  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    if (data) {
      setFormData({ ...data });
    }
  }, [data, open]);

  if (!data || !formData) return null;

  const handleSave = () => {
    if (nodeType === 'material') {
      dispatch(updateMaterial({ id: data.id, changes: formData }));
    } else {
      dispatch(updateSection({ id: data.id, changes: formData }));
    }
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (nodeType === 'material') {
      dispatch(deleteMaterial(data.id));
    } else {
      dispatch(deleteSection(data.id));
    }
    onOpenChange(false);
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Edit {nodeType === 'material' ? 'Material' : 'Section'} Properties</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name</Label>
            <Input id="name" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} className="col-span-3" />
          </div>

          {nodeType === 'material' ? (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">Type</Label>
                <Select value={formData.type} onValueChange={(v) => handleChange('type', v)}>
                  <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Steel">Steel</SelectItem>
                    <SelectItem value="Concrete">Concrete</SelectItem>
                    <SelectItem value="Timber">Timber</SelectItem>
                    <SelectItem value="Custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="youngsModulus" className="text-right">E (Young's)</Label>
                <Input id="youngsModulus" type="number" value={formData.youngsModulus} onChange={(e) => handleChange('youngsModulus', Number(e.target.value))} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="poissonRatio" className="text-right">Poisson's Ratio</Label>
                <Input id="poissonRatio" type="number" step="0.01" value={formData.poissonRatio} onChange={(e) => handleChange('poissonRatio', Number(e.target.value))} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="density" className="text-right">Density</Label>
                <Input id="density" type="number" value={formData.density} onChange={(e) => handleChange('density', Number(e.target.value))} className="col-span-3" />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">Type</Label>
                <Select value={formData.type} onValueChange={(v) => handleChange('type', v)}>
                  <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Rectangular">Rectangular</SelectItem>
                    <SelectItem value="Circular">Circular</SelectItem>
                    <SelectItem value="I-Section">I-Section</SelectItem>
                    <SelectItem value="Custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="materialId" className="text-right">Material</Label>
                <Select value={formData.materialId} onValueChange={(v) => handleChange('materialId', v)}>
                  <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {materials.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="area" className="text-right">Area</Label>
                <Input id="area" type="number" value={formData.area} onChange={(e) => handleChange('area', Number(e.target.value))} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="Ix" className="text-right">Ix</Label>
                <Input id="Ix" type="number" value={formData.Ix} onChange={(e) => handleChange('Ix', Number(e.target.value))} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="Iy" className="text-right">Iy</Label>
                <Input id="Iy" type="number" value={formData.Iy} onChange={(e) => handleChange('Iy', Number(e.target.value))} className="col-span-3" />
              </div>
            </>
          )}
        </div>
        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save changes</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
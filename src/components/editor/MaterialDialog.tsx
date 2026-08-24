import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type MaterialType = 'concrete' | 'steel' | 'timber' | null;

interface MaterialDialogProps {
  materialType: MaterialType;
  onClose: () => void;
}

export function MaterialDialog({ materialType, onClose }: MaterialDialogProps) {
  const [name, setName] = useState('');
  const [prop1, setProp1] = useState('');
  const [prop2, setProp2] = useState('');
  const [prop3, setProp3] = useState('');

  if (!materialType) return null;

  const title = materialType.charAt(0).toUpperCase() + materialType.slice(1);
  
  // 针对结构工程常用参数进行配置（结合了新西兰常用标准）
  const getConfig = () => {
    switch (materialType) {
      case 'concrete':
        return {
          placeholder: 'e.g., C30/37',
          p1: { label: 'Compressive Strength f\'c (MPa)', placeholder: '30' },
          p2: { label: 'Elastic Modulus E (GPa)', placeholder: '30' },
          p3: { label: 'Density (kg/m³)', placeholder: '2400' },
        };
      case 'steel':
        return {
          placeholder: 'e.g., Q355 / Grade 300',
          p1: { label: 'Yield Strength Fy (MPa)', placeholder: '355' },
          p2: { label: 'Elastic Modulus E (GPa)', placeholder: '200' },
          p3: { label: 'Density (kg/m³)', placeholder: '7850' },
        };
      case 'timber':
        return {
          placeholder: 'e.g., C24 / Radiata Pine No.1',
          p1: { label: 'Bending Strength Fb (MPa)', placeholder: '24' },
          p2: { label: 'Elastic Modulus E (GPa)', placeholder: '11' },
          p3: { label: 'Density (kg/m³)', placeholder: '500' },
        };
    }
  };

  const config = getConfig();

  const handleSave = () => {
    // TODO: 此处可接入你的 Redux store (如 dispatch(addMaterial(...))) 或后端 API
    console.log(`Creating ${materialType} material:`, { name, prop1, prop2, prop3 });
    onClose();
  };

  return (
    <Dialog open={!!materialType} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Create {title} Material</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Material Name / Grade</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={config.placeholder}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="prop1">{config.p1.label}</Label>
            <Input id="prop1" type="number" value={prop1} onChange={(e) => setProp1(e.target.value)} placeholder={config.p1.placeholder} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="prop2">{config.p2.label}</Label>
            <Input id="prop2" type="number" value={prop2} onChange={(e) => setProp2(e.target.value)} placeholder={config.p2.placeholder} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="prop3">{config.p3.label}</Label>
            <Input id="prop3" type="number" value={prop3} onChange={(e) => setProp3(e.target.value)} placeholder={config.p3.placeholder} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Material</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
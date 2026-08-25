import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { addMaterial, addSection } from '@/app/store/slices/propertiesSlice';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package } from 'lucide-react';

export function PropertiesDialog() {
  const dispatch = useAppDispatch();
  const materials = useAppSelector((s) => s.properties.materials);
  const sections = useAppSelector((s) => s.properties.sections);
  const [activeTab, setActiveTab] = useState('materials');

  // Material Form State
  const [matName, setMatName] = useState('');
  const [matType, setMatType] = useState<'Steel' | 'Concrete' | 'Timber' | 'Custom'>('Concrete');
  const [matE, setMatE] = useState('30000');
  const [matNu, setMatNu] = useState('0.2');
  const [matDensity, setMatDensity] = useState('2400');

  // Section Form State
  const [secName, setSecName] = useState('');
  const [secType, setSecType] = useState<'Rectangular' | 'Circular' | 'I-Section' | 'Custom'>('Rectangular');
  const [secMatId, setSecMatId] = useState(materials[0]?.id || '');
  const [secWidth, setSecWidth] = useState('200');
  const [secHeight, setSecHeight] = useState('300');

  const handleAddMaterial = () => {
    if (!matName) return;
    dispatch(addMaterial({
      name: matName, type: matType,
      youngsModulus: Number(matE), poissonRatio: Number(matNu), density: Number(matDensity),
    }));
    setMatName('');
  };

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
    <Dialog>
      <DialogTrigger asChild>
        <button className="px-3 py-1.5 rounded hover:bg-editor-hover hover:text-foreground transition-colors flex items-center gap-2 text-sm text-muted-foreground">
          <Package className="w-4 h-4" />
          Properties
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Material & Section Properties</DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="materials">Materials ({materials.length})</TabsTrigger>
            <TabsTrigger value="sections">Sections ({sections.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="materials" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={matName} onChange={(e) => setMatName(e.target.value)} placeholder="e.g., C30 Concrete" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={matType} onValueChange={(v: any) => setMatType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Concrete">Concrete</SelectItem>
                    <SelectItem value="Steel">Steel</SelectItem>
                    <SelectItem value="Timber">Timber</SelectItem>
                    <SelectItem value="Custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Young's Modulus (E)</Label>
                <Input type="number" value={matE} onChange={(e) => setMatE(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Poisson's Ratio (ν)</Label>
                <Input type="number" step="0.01" value={matNu} onChange={(e) => setMatNu(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Density (kg/m³)</Label>
                <Input type="number" value={matDensity} onChange={(e) => setMatDensity(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleAddMaterial} className="w-full">Add Material</Button>
            
            <div className="mt-4 border rounded-md">
              <div className="p-2 bg-muted font-medium text-sm">Existing Materials</div>
              <div className="max-h-40 overflow-y-auto">
                {materials.map(m => (
                  <div key={m.id} className="p-2 border-b text-sm flex justify-between items-center">
                    <span>{m.name} <span className="text-muted-foreground">({m.type})</span></span>
                    <span className="text-muted-foreground text-xs">E={m.youngsModulus}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sections" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={secName} onChange={(e) => setSecName(e.target.value)} placeholder="e.g., 200x300" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={secType} onValueChange={(v: any) => setSecType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Rectangular">Rectangular</SelectItem>
                    <SelectItem value="Circular">Circular</SelectItem>
                    <SelectItem value="I-Section">I-Section</SelectItem>
                    <SelectItem value="Custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Material</Label>
                <Select value={secMatId} onValueChange={setSecMatId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {materials.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Width (mm)</Label>
                <Input type="number" value={secWidth} onChange={(e) => setSecWidth(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Height (mm)</Label>
                <Input type="number" value={secHeight} onChange={(e) => setSecHeight(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleAddSection} className="w-full">Add Section</Button>

            <div className="mt-4 border rounded-md">
              <div className="p-2 bg-muted font-medium text-sm">Existing Sections</div>
              <div className="max-h-40 overflow-y-auto">
                {sections.map(s => {
                  const mat = materials.find(m => m.id === s.materialId);
                  return (
                    <div key={s.id} className="p-2 border-b text-sm flex justify-between items-center">
                      <span>{s.name} <span className="text-muted-foreground">({s.type})</span></span>
                      <span className="text-muted-foreground text-xs">{mat?.name || 'No Material'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
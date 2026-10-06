import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { addLoadCase, deleteLoadCase, type LoadCaseType } from '@/app/store/slices/loadSlice';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TYPES: LoadCaseType[] = ['Dead', 'Superimposed Dead', 'Live', 'Wind', 'Seismic', 'Temperature', 'Other'];

export function LoadCaseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const dispatch = useAppDispatch();
  const cases = useAppSelector((state) => state.loads.loadCases);
  const [name, setName] = useState('');
  const [type, setType] = useState<LoadCaseType>('Dead');
  const [swm, setSwm] = useState('0');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(''); setType('Dead'); setSwm('1'); setDescription('');
  }, [open]);

  const add = () => {
    const multiplier = Number(swm);
    if (!name.trim() || !Number.isFinite(multiplier) || multiplier < 0) return;
    dispatch(addLoadCase({ name: name.trim(), type, selfWeightMultiplier: multiplier, description: description.trim() }));
    setName(''); setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Define Load Cases</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Name</Label><Input className="h-8" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Roof Live" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Type</Label><Select value={type} onValueChange={(v) => { const next = v as LoadCaseType; setType(next); setSwm(next === 'Dead' ? '1' : '0'); }}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger><SelectContent>{TYPES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label className="text-xs">Self-weight Multiplier</Label><Input className="h-8" type="number" min="0" step="0.1" value={swm} onChange={(e) => setSwm(e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Description</Label><Input className="h-8" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" /></div>
          </div>
          <Button className="w-full h-9" onClick={add}>Add Load Case</Button>
          <div className="rounded-md border"><div className="p-2 bg-muted font-medium text-xs">Defined Load Cases</div><div className="max-h-64 overflow-y-auto">
            {cases.map((item) => <div key={item.id} className="p-2 border-b last:border-0 text-xs flex items-center justify-between gap-2"><div><div className="font-medium">{item.name}</div><div className="text-[10px] text-muted-foreground">{item.type} · SW={item.selfWeightMultiplier}</div>{item.description && <div className="text-[10px] text-muted-foreground">{item.description}</div>}</div>{item.source === 'user' && <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => dispatch(deleteLoadCase(item.id))}><Trash2 className="h-3.5 w-3.5" /></Button>}</div>)}
          </div></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

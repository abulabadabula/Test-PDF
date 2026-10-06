import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { addLoadCombination, deleteLoadCombination } from '@/app/store/slices/loadSlice';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type CombinationType = 'Ultimate' | 'Serviceability' | 'Other';
type Term = { loadCaseId: string; factor: string };

export function LoadCombinationDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const dispatch = useAppDispatch();
  const cases = useAppSelector((state) => state.loads.loadCases);
  const combinations = useAppSelector((state) => state.loads.loadCombinations);
  const [name, setName] = useState('');
  const [type, setType] = useState<CombinationType>('Ultimate');
  const [description, setDescription] = useState('');
  const [terms, setTerms] = useState<Term[]>([]);

  useEffect(() => {
    if (!open) return;
    setName(''); setType('Ultimate'); setDescription('');
    setTerms(cases[0] ? [{ loadCaseId: cases[0].id, factor: '1.0' }] : []);
  }, [open, cases]);

  const addTerm = () => {
    if (!cases.length) return;
    setTerms((current) => [...current, { loadCaseId: cases.find((c) => !current.some((t) => t.loadCaseId === c.id))?.id ?? cases[0].id, factor: '1.0' }]);
  };

  const add = () => {
    if (!name.trim() || !terms.length) return;
    const normalized = terms.map((term) => ({ loadCaseId: term.loadCaseId, factor: Number(term.factor) }));
    if (normalized.some((term) => !Number.isFinite(term.factor))) return;
    dispatch(addLoadCombination({ name: name.trim(), type, terms: normalized, description: description.trim() }));
    setName(''); setDescription('');
  };

  const caseName = (id: string) => cases.find((item) => item.id === id)?.name ?? 'Unknown';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Define Load Combinations</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Name</Label><Input className="h-8" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. ULS Gravity" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Type</Label><Select value={type} onValueChange={(v) => setType(v as CombinationType)}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Ultimate">Ultimate</SelectItem><SelectItem value="Serviceability">Serviceability</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div>
            <div className="col-span-2 space-y-1.5"><Label className="text-xs">Description</Label><Input className="h-8" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" /></div>
          </div>
          <div className="flex items-center justify-between"><div className="text-xs font-semibold">Combination Terms</div><Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" disabled={!cases.length} onClick={addTerm}><Plus className="h-3.5 w-3.5" />Add Term</Button></div>
          <div className="rounded-md border">
            {terms.map((term, index) => <div key={index} className="grid grid-cols-[1fr_120px_32px] gap-2 border-b p-2 last:border-0 items-center"><Select value={term.loadCaseId} onValueChange={(v) => setTerms((current) => current.map((t, i) => i === index ? { ...t, loadCaseId: v } : t))}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{cases.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select><Input className="h-8 text-xs" type="number" step="0.01" value={term.factor} onChange={(e) => setTerms((current) => current.map((t, i) => i === index ? { ...t, factor: e.target.value } : t))} /><Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => setTerms((current) => current.filter((_, i) => i !== index))}><Trash2 className="h-3.5 w-3.5" /></Button></div>)}
            {!terms.length && <div className="p-3 text-xs text-muted-foreground">Add at least one load case term.</div>}
          </div>
          <Button className="w-full h-9" disabled={!cases.length || !terms.length} onClick={add}>Add Load Combination</Button>
          <div className="rounded-md border"><div className="p-2 bg-muted font-medium text-xs">Defined Load Combinations</div><div className="max-h-64 overflow-y-auto">
            {combinations.map((item) => <div key={item.id} className="p-2 border-b last:border-0 text-xs flex items-start justify-between gap-2"><div><div className="font-medium">{item.name} <span className="text-muted-foreground">({item.type})</span></div><div className="mt-1 flex flex-wrap gap-1">{item.terms.map((term, i) => <span key={i} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">{term.factor} × {caseName(term.loadCaseId)}</span>)}</div>{item.description && <div className="mt-1 text-[10px] text-muted-foreground">{item.description}</div>}</div>{item.source === 'user' && <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => dispatch(deleteLoadCombination(item.id))}><Trash2 className="h-3.5 w-3.5" /></Button>}</div>)}
            {!combinations.length && <div className="p-3 text-xs text-muted-foreground text-center">No load combinations defined yet.</div>}
          </div></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

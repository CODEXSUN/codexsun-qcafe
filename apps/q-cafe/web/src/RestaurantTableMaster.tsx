import { useState } from 'react';
import { Armchair, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@codexsun/ui/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@codexsun/ui/components/ui/alert-dialog';
import type { RestaurantTable } from './api';

type Props = {
  tables: RestaurantTable[];
  mutate: (path: string, body: unknown) => Promise<unknown | false>;
};

type TableDraft = { id?: number; table_no: string; chair_count: string };

const newTable = (): TableDraft => ({ table_no: '', chair_count: '4' });

export function RestaurantTableMaster({ tables, mutate }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<TableDraft>(newTable);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  function startNew() {
    setSelectedId(null);
    setDraft(newTable());
  }

  function edit(table: RestaurantTable) {
    setSelectedId(table.id);
    setDraft({ id: table.id, table_no: table.table_no, chair_count: String(table.chair_count) });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const result = await mutate('table', { ...draft, chair_count: Number(draft.chair_count) });
    if (result) startNew();
  }

  return <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(18rem,0.8fr)_minmax(32rem,1.2fr)]">
    <section className="overflow-hidden rounded-xl border border-border bg-card"><div className="flex items-center justify-between border-b p-3"><h2 className="font-semibold">Restaurant tables</h2><Button type="button" size="sm" className="cursor-pointer" onClick={startNew}><Plus size={15}/> New table</Button></div><div>{tables.length === 0 ? <Empty/> : tables.map((table) => <div key={table.id} role="button" tabIndex={0} className={`flex cursor-pointer items-center gap-3 border-b p-3 hover:bg-muted/60 ${selectedId === table.id ? 'bg-muted' : ''}`} onClick={() => setSelectedId(table.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedId(table.id); }}><span className="grid size-10 place-items-center rounded-md bg-muted text-muted-foreground"><Armchair size={18}/></span><span className="min-w-0 flex-1"><b className="block text-sm">{table.table_no}</b><small className="text-muted-foreground">{table.chair_count} chairs · {table.status}</small></span><Button type="button" variant="ghost" size="icon" className="cursor-pointer" aria-label={`Edit ${table.table_no}`} title="Edit table" onClick={(event) => { event.stopPropagation(); edit(table); }}><Pencil size={15}/></Button><Button type="button" variant="ghost" size="icon" className="cursor-pointer text-destructive hover:text-destructive" aria-label={`Delete ${table.table_no}`} title="Delete table" onClick={(event) => { event.stopPropagation(); setDeleteId(table.id); }}><Trash2 size={15}/></Button></div>)}</div></section>
    <form className="rounded-xl border border-border bg-card" onSubmit={save}><div className="flex items-center justify-between border-b p-4"><div><h2 className="font-semibold">{draft.id ? 'Edit table' : 'New table'}</h2><p className="text-xs text-muted-foreground">Tables saved here become the floor cards and POS table choices.</p></div><Button type="submit" className="cursor-pointer"><Save size={15}/> Save table</Button></div><div className="grid gap-4 p-4 md:grid-cols-2"><label className="text-sm font-medium">Table name<input required value={draft.table_no} onChange={(event) => setDraft({ ...draft, table_no: event.target.value.toUpperCase() })} placeholder="T01" className="mt-1 h-10 w-full rounded-md border bg-background px-3"/></label><label className="text-sm font-medium">Chairs<input required type="number" min="1" max="24" value={draft.chair_count} onChange={(event) => setDraft({ ...draft, chair_count: event.target.value })} className="mt-1 h-10 w-full rounded-md border bg-background px-3"/></label></div></form>
    <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete restaurant table?</AlertDialogTitle><AlertDialogDescription>Tables with saved POS bills cannot be deleted.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={async () => { if (deleteId) { const result = await mutate('table/delete', { id: deleteId }); if (result) startNew(); setDeleteId(null); } }}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}

function Empty() {
  return <div className="grid min-h-40 place-items-center p-8 text-center text-sm text-muted-foreground"><span><Armchair className="mx-auto mb-2 size-6"/>No restaurant tables yet. Create the first table.</span></div>;
}

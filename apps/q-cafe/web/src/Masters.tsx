import { useMemo, useState } from 'react';
import { CheckCircle2, ImagePlus, LoaderCircle, Plus, Pencil, Trash2, Tags, PackageOpen, Save, Upload } from 'lucide-react';
import { Button } from '@codexsun/ui/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@codexsun/ui/components/ui/alert-dialog';
import { imageUrl, type Snapshot } from './api';
import type { InterfaceTopologyController } from '@codexsun/devkit-ito';
import { readTodaySpecialDefinitions } from './todaySpecials';
import { RestaurantTableMaster } from './RestaurantTableMaster';

type Props = { data: Snapshot; mutate: (path: string, body: unknown) => Promise<unknown | false>; topology: InterfaceTopologyController; navigate: (page: string) => void };
type Special = { prefix: string; name: string; price: string; is_enabled: boolean };
type ItemDraft = { id?: number; category_id: string; code: string; name: string; normal_price: string; image_path: string; specials: Special[] };
const emptyItem = (): ItemDraft => ({ category_id: '', code: '', name: '', normal_price: '', image_path: '', specials: [] });

export function Masters({ data, mutate }: Props) {
  const [tab, setTab] = useState<'items' | 'categories' | 'tables'>('items');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [item, setItem] = useState<ItemDraft>(emptyItem);
  const [itemBaseline, setItemBaseline] = useState(() => JSON.stringify(emptyItem()));
  const [newCategory, setNewCategory] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [categoryDraft, setCategoryDraft] = useState({ id: 0, code: '', name: '' });
  const [deleteCategoryId, setDeleteCategoryId] = useState<number | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  const [uploadNotice, setUploadNotice] = useState('');
  const [uploadPreview, setUploadPreview] = useState('');
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'complete' | 'error'>('idle');
  const [draggingImage, setDraggingImage] = useState(false);
  const categories = data.categories ?? [];
  const items = data.menu ?? [];
  const availableSpecials = readTodaySpecialDefinitions(data.master_settings);
  const itemDirty = JSON.stringify(item) !== itemBaseline;

  function editItem(source: typeof items[number]) {
    setSelectedId(source.id);
    let specials: Special[] = [];
    try { specials = JSON.parse(source.specials ?? '[]').filter((s: { id: number | null }) => s.id).map((s: { prefix: string; name: string; price: number; is_enabled: number }) => ({ prefix: s.prefix, name: s.name, price: String((s.price ?? 0) / 100), is_enabled: Boolean(s.is_enabled) })); } catch { /* invalid legacy value */ }
    const draft = { id: source.id, category_id: String(categories.find(category => category.name === source.category)?.id ?? ''), code: source.code, name: source.name, normal_price: String(source.price / 100), image_path: source.image_path ?? '', specials };
    setItem(draft);
    setItemBaseline(JSON.stringify(draft));
    setUploadPreview('');
    setUploadNotice('');
    setUploadState('idle');
  }
  async function saveItem(event: React.FormEvent) {
    event.preventDefault();
    const result = await mutate('item', { ...item, category_id: Number(item.category_id), normal_price: Math.round(Number(item.normal_price) * 100), specials: item.specials.map(s => ({ ...s, price: Math.round(Number(s.price) * 100) })) });
    if (result) { const draft = emptyItem(); setItem(draft); setItemBaseline(JSON.stringify(draft)); setSelectedId(null); setUploadPreview(''); setUploadNotice(''); setUploadState('idle'); }
  }
  async function saveCategory() {
    const result = await mutate('category', categoryDraft);
    if (result) { setNewCategory(false); setCategoryDraft({ id: 0, code: '', name: '' }); }
  }
  async function uploadImage(file: File | undefined) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5_000_000) {
      setUploadNotice('Choose a JPG, PNG, or WebP image smaller than 5 MB.');
      setUploadState('error');
      return;
    }
    setUploadPreview(URL.createObjectURL(file));
    setUploadNotice('Uploading image…');
    setUploadState('uploading');
    try {
      const contentBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
        reader.onerror = () => reject(new Error('The image could not be read.'));
        reader.readAsDataURL(file);
      });
      const result = await mutate('image', { file_name: file.name, content_type: file.type, content_base64: contentBase64 }) as { file_name?: string } | false;
      const fileName = result && result.file_name;
      if (!fileName) throw new Error('The image could not be saved.');
      setItem(current => ({ ...current, image_path: fileName }));
      setUploadNotice('Image uploaded and saved in the Q Cafe data folder.');
      setUploadState('complete');
    } catch (error) {
      setUploadNotice(error instanceof Error ? error.message : 'The image could not be uploaded.');
      setUploadState('error');
    }
  }

  return <div className="h-full min-h-0 w-full flex-1 overflow-y-auto scrollbar-slim p-4 sm:p-6"><div className="flex min-h-full w-full flex-col gap-4">
    <nav className="flex border-b border-border" aria-label="Master data"><button className={`px-4 py-3 text-sm font-semibold ${tab === 'items' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'}`} onClick={() => setTab('items')}>Items</button><button className={`px-4 py-3 text-sm font-semibold ${tab === 'categories' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'}`} onClick={() => setTab('categories')}>Categories</button><button className={`px-4 py-3 text-sm font-semibold ${tab === 'tables' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'}`} onClick={() => setTab('tables')}>Restaurant Tables</button></nav>
    {tab === 'items' ? <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(18rem,0.8fr)_minmax(32rem,1.2fr)]">
      <section className="overflow-hidden rounded-xl border border-border bg-card"><div className="flex items-center justify-between border-b p-3"><h2 className="font-semibold">Items</h2><Button type="button" size="sm" onClick={() => { const draft = emptyItem(); setSelectedId(null); setItem(draft); setItemBaseline(JSON.stringify(draft)); setUploadPreview(''); setUploadNotice(''); setUploadState('idle'); }}><Plus size={15}/> New item</Button></div><div>{items.length === 0 ? <Empty label="No items yet. Create your first item."/> : items.map(entry => <div key={entry.id} role="button" tabIndex={0} className={`flex w-full cursor-pointer items-center gap-3 border-b p-3 text-left hover:bg-muted/60 ${selectedId === entry.id ? 'bg-muted' : ''}`} onClick={() => setSelectedId(entry.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') setSelectedId(entry.id); }}><div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-md border bg-muted">{entry.image_path ? <img src={imageUrl(entry.image_path)} alt="" className="size-full object-cover"/> : <ImagePlus size={18} className="text-muted-foreground"/>}</div><span className="min-w-0 flex-1"><b className="block truncate text-sm">{entry.name}</b><small className="text-muted-foreground">{entry.code} · {entry.category}</small></span><span className="text-sm font-semibold">₹{(entry.price / 100).toFixed(2)}</span><span className="flex gap-1"><Button type="button" variant="ghost" size="icon" aria-label={`Edit ${entry.name}`} title="Edit item" onClick={event => { event.stopPropagation(); editItem(entry); }}><Pencil size={15}/></Button><Button type="button" variant="ghost" size="icon" aria-label={`Delete ${entry.name}`} title="Delete item" className="text-destructive hover:text-destructive" onClick={event => { event.stopPropagation(); setDeleteItemId(entry.id); }}><Trash2 size={15}/></Button></span></div>)}</div></section>
      <form className="rounded-xl border border-border bg-card" onSubmit={saveItem}><div className="flex items-center justify-between border-b p-4"><div><h2 className="flex items-center gap-2 font-semibold">{selectedId && item.id ? 'Edit item' : 'New item'}{itemDirty && <span className="size-2 rounded-full bg-yellow-400" title="Unsaved changes" aria-label="Unsaved changes"/>}</h2><p className="text-xs text-muted-foreground">Select an item to view it. Use its edit icon to load it into this form.</p></div><Button type="submit" disabled={!itemDirty}><Save size={15}/> Save item</Button></div><div className="grid gap-4 p-4 md:grid-cols-2">
        <label className="text-sm font-medium">Category<select required value={item.category_id} onChange={e => setItem({...item, category_id:e.target.value})} className="mt-1 h-10 w-full rounded-md border bg-background px-3"><option value="">Select category</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label className="text-sm font-medium">Item code<input required value={item.code} onChange={e => setItem({...item, code:e.target.value})} className="mt-1 h-10 w-full rounded-md border bg-background px-3"/></label>
        <label className="text-sm font-medium">Item name<input required value={item.name} onChange={e => setItem({...item, name:e.target.value})} className="mt-1 h-10 w-full rounded-md border bg-background px-3"/></label>
        <label className="text-sm font-medium">Normal price (₹)<input required type="number" min="0.01" step="0.01" value={item.normal_price} onChange={e => setItem({...item, normal_price:e.target.value})} className="mt-1 h-10 w-full rounded-md border bg-background px-3"/></label>
        <div className="md:col-span-2"><label onDragEnter={event => { event.preventDefault(); setDraggingImage(true); }} onDragOver={event => event.preventDefault()} onDragLeave={() => setDraggingImage(false)} onDrop={event => { event.preventDefault(); setDraggingImage(false); void uploadImage(event.dataTransfer.files?.[0]); }} className={`flex min-h-28 cursor-pointer items-center gap-4 rounded-lg border-2 border-dashed p-4 transition-colors ${draggingImage ? 'border-primary bg-primary/5' : uploadState === 'complete' ? 'border-emerald-500/60 bg-emerald-500/5' : 'border-border bg-card hover:border-primary/60 hover:bg-muted/30'}`}><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadState === 'uploading'} onChange={event => void uploadImage(event.target.files?.[0])}/>{uploadPreview || item.image_path ? <img src={uploadPreview || imageUrl(item.image_path)} alt="Item upload preview" className="size-20 shrink-0 rounded-md border object-cover"/> : <span className="grid size-14 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground"><ImagePlus size={24}/></span>}<span className="min-w-0"><span className="flex items-center gap-2 text-sm font-semibold">{uploadState === 'uploading' ? <LoaderCircle className="size-4 animate-spin text-primary"/> : uploadState === 'complete' ? <CheckCircle2 className="size-4 text-emerald-600"/> : <Upload className="size-4"/>}{uploadState === 'uploading' ? 'Uploading image…' : uploadState === 'complete' ? 'Upload complete' : 'Drop an image here or choose a file'}</span><span className={`mt-1 block text-xs ${uploadState === 'complete' ? 'text-emerald-700 dark:text-emerald-400' : uploadState === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>{uploadNotice || 'JPG, PNG, or WebP up to 5 MB. Images are stored only in the Q Cafe data folder.'}</span></span></label></div>
        <div className="md:col-span-2 rounded-lg border p-3"><div className="mb-3 flex items-center justify-between"><div><b className="text-sm">Special prices</b><p className="text-xs text-muted-foreground">Set any configured special price now. POS uses only the one Today Special selected in Settings.</p></div><Button type="button" variant="outline" size="sm" disabled={availableSpecials.length === 0} onClick={() => setItem({...item, specials:[...item.specials,{prefix:'',name:'',price:'',is_enabled:true}]})}><Plus size={14}/> Add special</Button></div>{availableSpecials.length === 0 && <p className="mb-3 text-xs text-muted-foreground">Add a Today Special definition in Settings first.</p>}{item.specials.map((special,index) => <div key={index} className="mb-2 grid gap-2 md:grid-cols-[minmax(10rem,1fr)_8rem_auto_auto]"><select required value={special.prefix} onChange={e => { const selected = availableSpecials.find((definition) => definition.prefix === e.target.value); setItem({...item,specials:item.specials.map((s,i)=>i===index?{...s,prefix:selected?.prefix ?? '',name:selected?.name ?? ''}:s)}); }} className="h-9 rounded-md border bg-background px-2"><option value="">Select Today Special</option>{availableSpecials.map((definition) => <option key={definition.id} value={definition.prefix}>{definition.prefix} · {definition.name}</option>)}</select><input required type="number" min="0.01" step="0.01" placeholder="Price" value={special.price} onChange={e => setItem({...item,specials:item.specials.map((s,i)=>i===index?{...s,price:e.target.value}:s)})} className="h-9 rounded-md border px-2"/><label className="flex h-9 cursor-pointer items-center gap-2 text-xs font-medium"><input type="checkbox" checked={special.is_enabled} onChange={e => setItem({...item,specials:item.specials.map((s,i)=>i===index?{...s,is_enabled:e.target.checked}:s)})} className="size-4 cursor-pointer accent-primary"/>Use in POS</label><button type="button" aria-label="Remove special price" className="cursor-pointer text-destructive" onClick={() => setItem({...item,specials:item.specials.filter((_,i)=>i!==index)})}><Trash2 size={16}/></button></div>)}</div>
      </div></form>
    </div> : tab === 'categories' ? <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(18rem,0.8fr)_minmax(32rem,1.2fr)]"><section className="rounded-xl border border-border bg-card"><div className="flex items-center justify-between border-b p-3"><h2 className="font-semibold">Categories</h2><Button size="sm" type="button" onClick={() => { setSelectedCategoryId(null); setNewCategory(true); setCategoryDraft({id:0,code:'',name:''}); }}><Plus size={15}/> New category</Button></div>{categories.length === 0 ? <Empty label="No categories yet."/> : categories.map(category => <div role="button" tabIndex={0} key={category.id} className={`flex w-full cursor-pointer items-center justify-between border-b p-3 text-left hover:bg-muted/60 ${selectedCategoryId === category.id ? 'bg-muted' : ''}`} onClick={() => setSelectedCategoryId(category.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') setSelectedCategoryId(category.id); }}><span><b className="block text-sm">{category.name}</b><small className="text-muted-foreground">{category.code}</small></span><span className="flex gap-1"><Button type="button" variant="ghost" size="icon" aria-label={`Edit ${category.name}`} title="Edit category" onClick={event => { event.stopPropagation(); setSelectedCategoryId(category.id); setNewCategory(true); setCategoryDraft({id:category.id,code:category.code,name:category.name}); }}><Pencil size={15}/></Button><Button type="button" variant="ghost" size="icon" aria-label={`Delete ${category.name}`} title="Delete category" className="text-destructive hover:text-destructive" onClick={event => { event.stopPropagation(); setDeleteCategoryId(category.id); }}><Trash2 size={15}/></Button></span></div>)}</section><section className="rounded-xl border border-border bg-card"><div className="flex items-center justify-between border-b p-4"><div><h2 className="font-semibold">{newCategory ? (categoryDraft.id ? 'Edit category' : 'New category') : 'Category details'}</h2><p className="text-xs text-muted-foreground">Select a category to view it. Use its edit icon to load it into this form.</p></div>{newCategory && <Button type="button" onClick={saveCategory}><Save size={15}/> Save</Button>}</div>{newCategory ? <div className="grid gap-4 p-4 md:grid-cols-2"><label className="text-sm font-medium">Category code<input required value={categoryDraft.code} onChange={e=>setCategoryDraft({...categoryDraft,code:e.target.value})} className="mt-1 h-10 w-full rounded-md border px-3"/></label><label className="text-sm font-medium">Category name<input required value={categoryDraft.name} onChange={e=>setCategoryDraft({...categoryDraft,name:e.target.value})} className="mt-1 h-10 w-full rounded-md border px-3"/></label></div> : <Empty label="Select a category or add a new one."/>}</section></div> : <RestaurantTableMaster tables={data.restaurant_tables} mutate={mutate}/>}
    <AlertDialog open={deleteCategoryId !== null} onOpenChange={open => !open && setDeleteCategoryId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete category?</AlertDialogTitle><AlertDialogDescription>This cannot be undone. Categories with items cannot be deleted.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={async()=>{ if(deleteCategoryId){ const result = await mutate('category/delete',{id:deleteCategoryId}); if(result){ setSelectedCategoryId(null); setNewCategory(false); setCategoryDraft({id:0,code:'',name:''}); } setDeleteCategoryId(null); }}}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <AlertDialog open={deleteItemId !== null} onOpenChange={open => !open && setDeleteItemId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete item?</AlertDialogTitle><AlertDialogDescription>This cannot be undone. Existing bills keep their own item details.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={async()=>{ if(deleteItemId){ const result = await mutate('item/delete',{id:deleteItemId}); if(result){ const draft = emptyItem(); setItem(draft); setItemBaseline(JSON.stringify(draft)); setSelectedId(null); } setDeleteItemId(null); }}}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div></div>;
}
function Empty({label}:{label:string}) { return <div className="grid min-h-40 place-items-center p-8 text-center text-sm text-muted-foreground"><span><PackageOpen className="mx-auto mb-2 size-6"/>{label}</span></div>; }

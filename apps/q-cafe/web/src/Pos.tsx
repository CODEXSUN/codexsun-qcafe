import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Printer, Trash2 } from 'lucide-react';
import { Button } from '@codexsun/ui/components/ui/button';
import { TopologyMarker, type InterfaceTopologyController } from '@codexsun/devkit-ito';
import { money, type MenuItem, type Snapshot } from './api';
import { field, TableSelect } from './Workspaces';

type EntryLine = { key: string; menuId?: number; code: string; name: string; quantity: number; price: number };
type Props = { data: Snapshot; busy: boolean; mutate: (path: string, body: unknown) => Promise<boolean>; topology: InterfaceTopologyController };

export function Pos({ data, busy, mutate, topology }: Props) {
  const codeInput = useRef<HTMLInputElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const quantityInput = useRef<HTMLInputElement>(null);
  const rateInput = useRef<HTMLInputElement>(null);
  const inputs = [codeInput, nameInput, quantityInput, rateInput] as const;
  const escapeState = useRef({ index: -1, armed: false });
  const [lines, setLines] = useState<EntryLine[]>([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [rate, setRate] = useState('');
  const total = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const parsedQuantity = parseQuantity(quantity);
  const parsedPrice = parsePrice(rate);
  const amount = parsedQuantity && parsedPrice ? parsedQuantity * parsedPrice : 0;

  useEffect(() => {
    const print = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'F8') return;
      event.preventDefault();
      window.print();
    };
    window.addEventListener('keydown', print);
    return () => window.removeEventListener('keydown', print);
  }, []);

  function applyLookup(item: MenuItem) {
    setCode(item.code);
    setName(item.name);
    setRate(formatDecimal(item.price / 100));
  }

  function updateCode(value: string) {
    setCode(value);
    const item = data.menu.find((candidate) => candidate.code.toLowerCase() === value.trim().toLowerCase());
    if (item) applyLookup(item);
  }

  function updateName(value: string) {
    setName(value);
    const item = data.menu.find((candidate) => candidate.name.toLowerCase() === value.trim().toLowerCase());
    if (item) applyLookup(item);
  }

  function rejectInput(index: number) {
    requestAnimationFrame(() => focusAndSelect(inputs[index]!));
    return false;
  }

  function addLine() {
    const cleanCode = code.trim();
    const cleanName = name.trim();
    if (!cleanCode) return rejectInput(0);
    if (!cleanName) return rejectInput(1);
    if (!parsedQuantity) return rejectInput(2);
    if (!parsedPrice) return rejectInput(3);
    const menuId = data.menu.find((item) => item.code.toLowerCase() === cleanCode.toLowerCase())?.id;
    setLines((current) => [...current, { key: crypto.randomUUID(), menuId, code: cleanCode, name: cleanName, quantity: parsedQuantity, price: parsedPrice }]);
    setCode(''); setName(''); setQuantity('1'); setRate('');
    requestAnimationFrame(() => focusAndSelect(inputs[0]));
    return true;
  }

  function handleEntryKey(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (escapeState.current.armed && escapeState.current.index === index) {
        const previous = Math.max(0, index - 1);
        escapeState.current = { index: previous, armed: false };
        focusAndSelect(inputs[previous]!);
      } else {
        escapeState.current = { index, armed: true };
        event.currentTarget.select();
      }
      return;
    }
    escapeState.current = { index: -1, armed: false };
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (index < inputs.length - 1) focusAndSelect(inputs[index + 1]!);
    else addLine();
  }

  async function submitOrder(form: HTMLFormElement) {
    const values = new FormData(form);
    const sent = await mutate('/orders', { table_name: values.get('table_name'), lines: lines.map((line) => ({ menu_id: line.menuId, item_code: line.code, name: line.name, quantity: line.quantity, price: line.price })) });
    if (sent) { setLines([]); focusAndSelect(inputs[0]); }
  }

  return <form className="grid min-h-[540px] gap-4 xl:grid-cols-[minmax(0,1fr)_300px] print:block" onSubmit={(event) => { event.preventDefault(); void submitOrder(event.currentTarget); }}>
    <section className="ito-region flex min-h-[540px] min-w-0 flex-col border border-border bg-card" {...topology.regionProps('q3.3')}><TopologyMarker id="q3.3" topology={topology}/>
      <div className="flex items-center justify-between border-b border-border px-4 py-3"><strong>Cart</strong><TableSelect takeaway /></div>
      <div className="hidden px-4 py-3 print:block"><h2 className="text-xl font-semibold">Q Cafe bill</h2><p>{new Date().toLocaleString()}</p></div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[760px] table-fixed border-collapse text-sm">
          <colgroup><col className="w-[140px]"/><col/><col className="w-[110px]"/><col className="w-[130px]"/><col className="w-[140px]"/><col className="w-[48px]"/></colgroup>
          <thead><tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"><th className="px-4 py-2">Item code</th><th className="px-2 py-2">Item name</th><th className="px-2 py-2">Qty</th><th className="px-2 py-2">Rate</th><th className="px-2 py-2">Amount</th><th><span className="sr-only">Remove</span></th></tr></thead>
          <tbody>{lines.map((line) => <tr className="border-b border-border" key={line.key}><td className="px-4 py-3">{line.code}</td><td className="px-2 py-3">{line.name}</td><td className="px-2 py-3">{formatDecimal(line.quantity)}</td><td className="px-2 py-3">{money(line.price)}</td><td className="px-2 py-3 font-semibold">{money(line.price * line.quantity)}</td><td className="px-2 print:hidden"><button aria-label={`Remove ${line.name}`} className="cursor-pointer text-muted-foreground hover:text-destructive" onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))} type="button"><Trash2 size={16}/></button></td></tr>)}</tbody>
        </table>
        <datalist id="q-cafe-code-list">{data.menu.map((item) => <option key={item.id} value={item.code}>{item.name}</option>)}</datalist>
        <datalist id="q-cafe-name-list">{data.menu.map((item) => <option key={item.id} value={item.name}>{item.code}</option>)}</datalist>
      </div>
      <div className="overflow-x-auto border-t border-border bg-muted/30 print:hidden"><table className="w-full min-w-[760px] table-fixed border-collapse text-sm"><colgroup><col className="w-[140px]"/><col/><col className="w-[110px]"/><col className="w-[130px]"/><col className="w-[140px]"/><col className="w-[48px]"/></colgroup><tbody><tr><td className="p-2 pl-4"><EntryInput inputRef={inputs[0]} label="Item code" list="q-cafe-code-list" onChange={updateCode} onKeyDown={(event) => handleEntryKey(event, 0)} value={code}/></td><td className="p-2"><EntryInput inputRef={inputs[1]} label="Item name" list="q-cafe-name-list" onChange={updateName} onKeyDown={(event) => handleEntryKey(event, 1)} value={name}/></td><td className="p-2"><EntryInput inputMode="decimal" inputRef={inputs[2]} label="Qty" onChange={setQuantity} onKeyDown={(event) => handleEntryKey(event, 2)} value={quantity}/></td><td className="p-2"><EntryInput inputMode="decimal" inputRef={inputs[3]} label="Rate" onChange={setRate} onKeyDown={(event) => handleEntryKey(event, 3)} value={rate}/></td><td className="p-2"><span className="sr-only">Amount</span><output className={`${field} block min-h-10 w-full font-semibold`}>{amount ? money(amount) : '—'}</output></td><td className="p-2"><button aria-label="Add line" className="grid size-10 cursor-pointer place-items-center rounded-lg bg-primary font-semibold text-primary-foreground disabled:cursor-default disabled:opacity-50" disabled={!code.trim() || !name.trim() || !parsedQuantity || !parsedPrice} onClick={addLine} type="button">+</button></td></tr></tbody></table></div>
      <div className="flex items-center justify-between gap-4 border-t border-border p-4"><div className="text-lg font-semibold">Total <span className="ml-4">{money(total)}</span></div><div className="flex gap-2 print:hidden"><Button className="cursor-pointer" onClick={() => window.print()} type="button" variant="outline"><Printer size={16}/>Print bill</Button><Button className="cursor-pointer" disabled={busy || !lines.length} type="submit">Send to kitchen</Button></div></div>
    </section>
    <aside className="ito-region flex flex-col border border-border bg-card print:hidden" {...topology.regionProps('q3.4')}><TopologyMarker id="q3.4" topology={topology}/>
      <div className="border-b border-border px-4 py-4 font-semibold">Item list</div>
      <div className="min-h-0 flex-1 overflow-y-auto">{data.menu.map((item) => <button className="flex w-full cursor-pointer items-center justify-between gap-3 border-b border-border px-4 py-3 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none" key={item.id} onClick={() => { applyLookup(item); requestAnimationFrame(() => focusAndSelect(inputs[0])); }} type="button"><span className="min-w-0"><strong className="block truncate text-sm">{item.name}</strong><span className="text-xs text-muted-foreground">{item.code}</span></span><span className="shrink-0 text-sm font-medium">{money(item.price)}</span></button>)}</div>
    </aside>
  </form>;
}

function EntryInput({ inputRef, inputMode, label, list, onChange, onKeyDown, value }: { inputRef: React.RefObject<HTMLInputElement | null>; inputMode?: 'decimal'; label: string; list?: string; onChange: (value: string) => void; onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void; value: string }) {
  return <label className="block"><span className="sr-only">{label}</span><input ref={inputRef} aria-label={label} autoComplete="off" autoFocus={label === 'Item code'} className={`${field} w-full min-w-0`} inputMode={inputMode} list={list} onChange={(event) => onChange(event.target.value)} onFocus={(event) => event.currentTarget.select()} onKeyDown={onKeyDown} placeholder={label} type="text" value={value}/></label>;
}

function focusAndSelect(ref: React.RefObject<HTMLInputElement | null>) { ref.current?.focus(); ref.current?.select(); }

function parseQuantity(value: string) {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,3})?$/u.test(normalized)) return 0;
  const result = Number(normalized);
  return result > 0 && result <= 99 ? result : 0;
}

function parsePrice(value: string) {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/u.test(normalized)) return 0;
  const result = Math.round(Number(normalized) * 100);
  return result > 0 && result <= 100_000_000 ? result : 0;
}

function formatDecimal(value: number) { return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 }).format(value); }

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Check, Coffee, Eye, Pencil, Plus, Printer, Receipt, Trash2, X } from 'lucide-react';
import { Button } from '@codexsun/ui/components/ui/button';
import { TopologyMarker, type InterfaceTopologyController } from '@codexsun/devkit-ito';
import { money, type MenuItem, type Snapshot } from './api';
import { field } from './Workspaces';
import { getMergedMenu, getMergedTables, type CustomMenuItem, type TableMasterConfig } from './mastersStore';
import { ThermalBillReceipt } from './ThermalBillReceipt';
import { outputReceipt } from './printReceipt';
import { loadSettings, type CafeSettings } from './Settings';

const tables = Array.from({ length: 12 }, (_, index) => `T${String(index + 1).padStart(2, '0')}`);

function formatChair(table: string, chair: number | string) {
  const match = table.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    return `${num}.${chair}`;
  }
  return `P.${chair}`;
}

export type AutocompleteOption<T = unknown> = {
  id: string | number;
  label: string;
  sublabel?: string;
  badge?: string;
  meta?: string;
  data: T;
};

type EntryLine = { key: string; menuId?: number; code: string; name: string; quantity: number; price: number; chair?: number };

type OrderTab = {
  id: string;
  name: string;
  tableName: string;
  chair: string;
  lines: EntryLine[];
  code: string;
  nameInput: string;
  quantity: string;
  rate: string;
  gstApplied: boolean;
};

type Props = { data: Snapshot; busy: boolean; mutate: (path: string, body: unknown) => Promise<unknown | false>; topology: InterfaceTopologyController };

export function Pos({ data, busy, mutate, topology }: Props) {
  const tableInput = useRef<HTMLInputElement>(null);
  const chairInput = useRef<HTMLInputElement>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const quantityInput = useRef<HTMLInputElement>(null);
  const rateInput = useRef<HTMLInputElement>(null);
  const inputs = [tableInput, chairInput, codeInput, nameInput, quantityInput, rateInput] as const;
  const escapeState = useRef({ index: -1, armed: false });
  const nextTabNum = useRef(2);

  const [cafeSettings, setCafeSettings] = useState<CafeSettings>(() => loadSettings());
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);

  const [tabs, setTabs] = useState<OrderTab[]>(() => {
    const defaultTable = loadSettings().defaultServiceType === 'Takeaway' ? 'Parcel' : 'T01';
    return [
      {
        id: 'tab-1',
        name: 'Order 1',
        tableName: defaultTable,
        chair: '1',
        lines: [],
        code: '',
        nameInput: '',
        quantity: '1',
        rate: '',
        gstApplied: false,
      },
    ];
  });
  const [activeTabId, setActiveTabId] = useState('tab-1');

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0]!;
  const lines = activeTab.lines;
  const code = activeTab.code;
  const name = activeTab.nameInput;
  const quantity = activeTab.quantity;
  const rate = activeTab.rate;
  const tableName = activeTab.tableName;
  const chair = activeTab.chair ?? '1';
  const gstApplied = activeTab.gstApplied ?? false;
  const [chairInputText, setChairInputText] = useState<string | null>(null);
  const [editingLineKey, setEditingLineKey] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<CustomMenuItem[]>(() => getMergedMenu(data.menu));
  const [tableConfigs, setTableConfigs] = useState<TableMasterConfig[]>(() => getMergedTables(data.restaurant_tables));

  useEffect(() => {
    setEditingLineKey(null);
  }, [activeTabId]);

  useEffect(() => {
    const handleMenuUpdate = () => setMenuItems(getMergedMenu(data.menu));
    const handleTablesUpdate = () => setTableConfigs(getMergedTables(data.restaurant_tables));

    window.addEventListener('q-cafe-menu-updated', handleMenuUpdate);
    window.addEventListener('q-cafe-tables-updated', handleTablesUpdate);
    return () => {
      window.removeEventListener('q-cafe-menu-updated', handleMenuUpdate);
      window.removeEventListener('q-cafe-tables-updated', handleTablesUpdate);
    };
  }, [data.menu, data.restaurant_tables]);

  useEffect(() => {
    const handleSettingsUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<CafeSettings>;
      if (customEvent.detail) {
        setCafeSettings(customEvent.detail);
      }
    };
    window.addEventListener('q-cafe-settings-updated', handleSettingsUpdate);
    return () => window.removeEventListener('q-cafe-settings-updated', handleSettingsUpdate);
  }, []);

  const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  const gstRateMultiplier = (cafeSettings.defaultGstRate ?? 5) / 100;
  const gstAmount = gstApplied ? Math.round(subtotal * gstRateMultiplier) : 0;
  const total = subtotal + gstAmount;
  const parsedQuantity = parseQuantity(quantity);
  const parsedPrice = parsePrice(rate);
  const amount = parsedQuantity && parsedPrice ? parsedQuantity * parsedPrice : 0;

  useEffect(() => {
    const print = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'F8') return;
      event.preventDefault();
      if (!lines.length) return;
      outputReceipt(cafeSettings, () => setShowReceiptPreview(true));
    };
    window.addEventListener('keydown', print);
    return () => window.removeEventListener('keydown', print);
  }, [lines.length]);

  function updateActiveTab(updates: Partial<OrderTab> | ((current: OrderTab) => Partial<OrderTab>)) {
    setTabs((currentTabs) =>
      currentTabs.map((t) => {
        if (t.id !== activeTabId) return t;
        const patch = typeof updates === 'function' ? updates(t) : updates;
        return { ...t, ...patch };
      })
    );
  }

  function setLines(updater: EntryLine[] | ((prev: EntryLine[]) => EntryLine[])) {
    updateActiveTab((tab) => ({
      lines: typeof updater === 'function' ? updater(tab.lines) : updater,
    }));
  }

  function setCode(value: string) {
    updateActiveTab({ code: value });
  }

  function setName(value: string) {
    updateActiveTab({ nameInput: value });
  }

  function setQuantity(value: string) {
    updateActiveTab({ quantity: value });
  }

  function setRate(value: string) {
    updateActiveTab({ rate: value });
  }

  function setTableName(value: string) {
    updateActiveTab({ tableName: value });
  }

  function setChair(value: string) {
    updateActiveTab({ chair: value });
  }

  function updateLineChair(lineKey: string, newChair: number) {
    setLines((current) =>
      current.map((item) => (item.key === lineKey ? { ...item, chair: newChair } : item))
    );
  }

  function updateLine(
    lineKey: string,
    updates: Partial<Pick<EntryLine, 'code' | 'name' | 'quantity' | 'price' | 'menuId' | 'chair'>>
  ) {
    setLines((current) =>
      current.map((item) => (item.key === lineKey ? { ...item, ...updates } : item))
    );
  }

  function handleInlineCodeChange(lineKey: string, val: string) {
    const clean = val.trim().toLowerCase();
    const item = menuItems.find(
      (m) => m.code.toLowerCase() === clean || m.name.toLowerCase() === clean
    );
    if (item) {
      updateLine(lineKey, {
        code: item.code,
        name: item.name,
        price: item.price,
        menuId: item.id,
      });
    } else {
      updateLine(lineKey, { code: val });
    }
  }

  const tableOptions: AutocompleteOption<string>[] = useMemo(() => {
    return tableConfigs.map((t) => ({
      id: t.tableNo,
      label: t.tableNo,
      sublabel: t.type === 'parcel' ? 'Takeaway order' : `Table ${parseInt(t.tableNo.replace(/\D/g, '') || '0', 10)} (${t.chairCount} seats)`,
      badge: t.type === 'parcel' ? 'Parcel' : `${t.chairCount} Seats`,
      data: t.tableNo,
    }));
  }, [tableConfigs]);

  const currentTableConfig = useMemo(() => {
    return tableConfigs.find(
      (t) => t.tableNo.toLowerCase() === tableName.trim().toLowerCase()
    );
  }, [tableConfigs, tableName]);

  const tableChairCount = currentTableConfig?.chairCount || 4;

  const chairOptions: AutocompleteOption<number>[] = useMemo(() => {
    return Array.from({ length: tableChairCount }, (_, idx) => {
      const num = idx + 1;
      return {
        id: num,
        label: formatChair(tableName, num),
        sublabel: `Chair ${num}`,
        data: num,
      };
    });
  }, [tableName, tableChairCount]);

  const chairOptionsForTable = useMemo(() => {
    const maxChair = Math.max(tableChairCount, ...lines.map((l) => l.chair ?? 1));
    return Array.from({ length: maxChair }, (_, idx) => idx + 1);
  }, [tableChairCount, lines]);

  const codeOptions: AutocompleteOption<MenuItem>[] = useMemo(() => {
    return menuItems.map((item) => ({
      id: item.id,
      label: item.code,
      sublabel: item.name,
      badge: item.category,
      meta: money(item.price),
      data: item,
    }));
  }, [menuItems]);

  const nameOptions: AutocompleteOption<MenuItem>[] = useMemo(() => {
    return menuItems.map((item) => ({
      id: item.id,
      label: item.name,
      sublabel: item.code,
      badge: item.category,
      meta: money(item.price),
      data: item,
    }));
  }, [menuItems]);

  function createTab() {
    const num = nextTabNum.current++;
    const newId = `tab-${crypto.randomUUID()}`;
    const defaultTable = cafeSettings.defaultServiceType === 'Takeaway' ? 'Parcel' : 'T01';
    const newTab: OrderTab = {
      id: newId,
      name: `Order ${num}`,
      tableName: defaultTable,
      chair: '1',
      lines: [],
      code: '',
      nameInput: '',
      quantity: '1',
      rate: '',
      gstApplied: false,
    };
    setTabs((current) => [...current, newTab]);
    setActiveTabId(newId);
    requestAnimationFrame(() => focusAndSelect(codeInput));
  }

  function closeTab(idToClose: string) {
    if (tabs.length <= 1) return;
    setTabs((current) => {
      const filtered = current.filter((t) => t.id !== idToClose);
      if (activeTabId === idToClose) {
        setActiveTabId(filtered[0]!.id);
      }
      return filtered;
    });
  }

  function applyLookup(item: MenuItem) {
    updateActiveTab({
      code: item.code,
      nameInput: item.name,
      rate: formatDecimal(item.price / 100),
    });
  }

  function updateCode(value: string) {
    setCode(value);
    const item = menuItems.find((candidate) => candidate.code.toLowerCase() === value.trim().toLowerCase());
    if (item) applyLookup(item);
  }

  function updateName(value: string) {
    setName(value);
    const item = menuItems.find((candidate) => candidate.name.toLowerCase() === value.trim().toLowerCase());
    if (item) applyLookup(item);
  }

  function rejectInput(index: number) {
    requestAnimationFrame(() => focusAndSelect(inputs[index]!));
    return false;
  }

  function handleEscape(index: number) {
    if (escapeState.current.armed && escapeState.current.index === index) {
      const previous = Math.max(0, index - 1);
      escapeState.current = { index: previous, armed: false };
      focusAndSelect(inputs[previous]!);
    } else {
      escapeState.current = { index, armed: true };
      inputs[index]?.current?.select();
    }
  }

  function handleTableEnter() {
    const clean = tableName.trim().toLowerCase();
    const match = tableOptions.find(
      (opt) => opt.label.toLowerCase() === clean || String(opt.id).toLowerCase() === clean
    );
    if (match) {
      setTableName(match.data);
    }
    focusAndSelect(chairInput);
  }

  function handleChairEnter() {
    if (chairInputText) {
      const clean = chairInputText.trim().toLowerCase();
      const match = chairOptions.find(
        (opt) => opt.label.toLowerCase() === clean || String(opt.data) === clean || `chair ${opt.data}` === clean
      );
      if (match) {
        setChair(String(match.data));
      }
      setChairInputText(null);
    }
    focusAndSelect(codeInput);
  }

  function handleCodeEnter() {
    const item = menuItems.find((candidate) => candidate.code.toLowerCase() === code.trim().toLowerCase());
    if (item) {
      applyLookup(item);
      focusAndSelect(quantityInput);
    } else if (code.trim()) {
      focusAndSelect(nameInput);
    } else {
      rejectInput(2);
    }
  }

  function handleNameEnter() {
    const item = menuItems.find((candidate) => candidate.name.toLowerCase() === name.trim().toLowerCase());
    if (item) {
      applyLookup(item);
    }
    if (!name.trim()) {
      rejectInput(3);
      return;
    }
    focusAndSelect(quantityInput);
  }

  function handleEntryKey(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key === 'Escape') {
      event.preventDefault();
      handleEscape(index);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (index === 4) {
        if (!parsedQuantity) return rejectInput(4);
        focusAndSelect(rateInput);
        return;
      }
      if (index === 5) {
        if (!parsedPrice) return rejectInput(5);
        addLine();
        return;
      }
    }
  }

  function addLine() {
    const cleanCode = code.trim();
    const cleanName = name.trim();
    if (!cleanCode) return rejectInput(2);
    if (!cleanName) return rejectInput(3);
    if (!parsedQuantity) return rejectInput(4);
    if (!parsedPrice) return rejectInput(5);
    const menuId = menuItems.find((item) => item.code.toLowerCase() === cleanCode.toLowerCase())?.id;
    const currentChair = Number(chair) || 1;
    const currentTableConfig = tableConfigs.find(
      (t) => t.tableNo.toLowerCase() === tableName.trim().toLowerCase()
    );
    const maxChairs = currentTableConfig?.chairCount || 4;
    const nextChair = currentChair >= maxChairs ? 1 : currentChair + 1;
    updateActiveTab((tab) => ({
      lines: [
        ...tab.lines,
        {
          key: crypto.randomUUID(),
          menuId,
          code: cleanCode,
          name: cleanName,
          quantity: parsedQuantity,
          price: parsedPrice,
          chair: currentChair,
        },
      ],
      code: '',
      nameInput: '',
      quantity: '1',
      rate: '',
      chair: String(nextChair),
    }));
    requestAnimationFrame(() => focusAndSelect(codeInput));
    return true;
  }

  async function submitOrder(form: HTMLFormElement) {
    const values = new FormData(form);
    const rawTable = String(values.get('table_name') || tableName).trim();
    let apiTable = rawTable;
    let tablePrefix = '';
    if (rawTable.toLowerCase() === 'parcel' || rawTable.toLowerCase() === 'takeaway') {
      apiTable = 'Takeaway';
    } else if (!/^T(0[1-9]|1[0-2])$/.test(rawTable)) {
      const match = rawTable.match(/\d+/);
      const num = match ? parseInt(match[0], 10) : 12;
      apiTable = `T${String(Math.min(12, Math.max(1, ((num - 1) % 12) + 1))).padStart(2, '0')}`;
      tablePrefix = `[${rawTable}] `;
    }

    const sent = await mutate('/orders', {
      table_name: apiTable,
      lines: lines.map((line) => ({
        menu_id: line.menuId,
        item_code: line.code,
        name: tablePrefix ? `${tablePrefix}${line.name}` : line.name,
        quantity: line.quantity,
        price: line.price,
      })),
    });
    if (sent) {
      if (cafeSettings.autoPrintBill) {
        requestAnimationFrame(() => window.print());
      }
      if (tabs.length > 1) {
        closeTab(activeTabId);
      } else {
        const defaultTable = cafeSettings.defaultServiceType === 'Takeaway' ? 'Parcel' : 'T01';
        updateActiveTab({
          tableName: defaultTable,
          chair: '1',
          lines: [],
          code: '',
          nameInput: '',
          quantity: '1',
          rate: '',
          gstApplied: false,
        });
      }
      focusAndSelect(codeInput);
    }
  }

  return (
    <form
      className="ito-region relative flex flex-1 flex-col min-h-[540px] lg:min-h-0 gap-3 print:block print:min-h-0 print:p-0 print:m-0 print:border-none print:shadow-none print:gap-0"
      onSubmit={(event) => {
        event.preventDefault();
        void submitOrder(event.currentTarget);
      }}
      {...topology.regionProps('q7')}
    >
      <TopologyMarker id="q7" topology={topology} />
      <div
        className="ito-region relative flex shrink-0 items-center justify-between gap-4 border border-border bg-card px-3 py-2 print:hidden"
        {...topology.regionProps('q7.1.5')}
      >
        <TopologyMarker id="q7.1.5" topology={topology} />

        {/* Left: Client Hold Tabs */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-slim">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const count = tab.lines.reduce((sum, l) => sum + l.quantity, 0);
            return (
              <div
                key={tab.id}
                onClick={() => {
                  setActiveTabId(tab.id);
                  requestAnimationFrame(() => focusAndSelect(codeInput));
                }}
                className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                    : 'border-border bg-muted/40 text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
                title={`${tab.name} (${tab.tableName})`}
              >
                <span className="font-semibold">{tab.name}</span>
                {count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                      isActive
                        ? 'bg-primary-foreground/25 text-primary-foreground'
                        : 'border border-border bg-background text-foreground'
                    }`}
                  >
                    {count}
                  </span>
                )}
                {tabs.length > 1 && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      closeTab(tab.id);
                    }}
                    aria-label={`Close ${tab.name}`}
                    className={`ml-0.5 grid size-4 cursor-pointer place-items-center rounded hover:bg-black/15 ${
                      isActive ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={createTab}
            title="Hold current order and open new client tab"
            className="flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-dashed border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:bg-accent hover:text-foreground"
          >
            <Plus size={13} />
            <span>+ Hold tab</span>
          </button>
        </div>

        {/* Right: Total + Action Buttons */}
        <div className="flex shrink-0 items-center gap-4">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total</span>
            <span className="text-xl font-bold tracking-tight text-foreground">{money(total)}</span>
            {lines.length > 0 && (
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {lines.length} {lines.length === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              className="cursor-pointer gap-1.5"
              onClick={() => outputReceipt(cafeSettings, () => setShowReceiptPreview(true))}
              type="button"
              variant="outline"
              disabled={!lines.length}
              title="Preview 3-inch thermal bill slip"
            >
              <Eye size={15} />
              Preview slip
            </Button>
            <Button
              className="cursor-pointer"
              onClick={() => outputReceipt(cafeSettings, () => setShowReceiptPreview(true))}
              type="button"
              variant="outline"
              disabled={!lines.length}
            >
              <Printer size={16} />
              Print bill
            </Button>
            <Button className="cursor-pointer" disabled={busy || !lines.length} type="submit">
              Send to kitchen
            </Button>
          </div>
        </div>
      </div>
      <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[300px_minmax(0,1fr)] print:hidden">
        <aside
          className="ito-region flex min-h-[300px] lg:min-h-0 min-w-0 flex-col border border-border bg-card print:hidden"
          {...topology.regionProps('q7.2')}
        >
          <TopologyMarker id="q7.2" topology={topology} />
          <div className="flex items-center justify-between border-b border-border px-4 py-3 font-semibold">
            <span>Item list</span>
            <span className="text-xs font-normal text-muted-foreground">{menuItems.length} items</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-slim">
            {menuItems.map((item) => (
              <button
                className="flex w-full cursor-pointer items-center justify-between gap-2.5 border-b border-border px-3 py-2.5 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none transition-colors"
                key={item.code}
                onClick={() => {
                  applyLookup(item);
                  requestAnimationFrame(() => focusAndSelect(quantityInput));
                }}
                type="button"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="relative size-11 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/40 shadow-2xs">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="grid size-full place-items-center bg-primary/10 text-primary">
                        <Coffee size={18} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <strong className="block truncate text-sm text-foreground">{item.name}</strong>
                    <span className="font-mono text-xs text-muted-foreground">{item.code}</span>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold text-primary">{money(item.price)}</span>
              </button>
            ))}
          </div>
        </aside>

        <section
          className="ito-region flex min-h-[300px] lg:min-h-0 min-w-0 flex-1 flex-col border border-border bg-card"
          {...topology.regionProps('q7.1')}
        >
          <TopologyMarker id="q7.1" topology={topology} />
          <div className="ito-region relative min-h-0 flex-1 overflow-auto scrollbar-slim" {...topology.regionProps('q7.1.2')}>
            <TopologyMarker id="q7.1.2" topology={topology} />
            <table className="w-full min-w-[760px] table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-[80px]" />
                <col className="w-[130px]" />
                <col />
                <col className="w-[110px]" />
                <col className="w-[100px]" />
                <col className="w-[110px]" />
                <col className="w-[80px]" />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-3">Chair</th>
                  <th className="px-3 py-3">Item code</th>
                  <th className="px-2 py-3">Item name</th>
                  <th className="px-2 py-3">Qty</th>
                  <th className="px-2 py-3">Rate</th>
                  <th className="px-2 py-3">Amount</th>
                  <th className="w-20 px-2 py-3 text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => {
                  const isEditing = editingLineKey === line.key;
                  return (
                    <tr
                      className={`border-b border-border transition-colors ${
                        isEditing ? 'bg-primary/5' : 'hover:bg-muted/30'
                      }`}
                      key={line.key}
                      onDoubleClick={() => setEditingLineKey(isEditing ? null : line.key)}
                    >
                      <td className="px-3 py-3">
                        <span className="hidden print:inline font-mono text-xs font-semibold">{formatChair(tableName, line.chair ?? (index + 1))}</span>
                        <select
                          aria-label="Chair"
                          className="print:hidden rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-xs font-semibold text-foreground hover:bg-accent cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                          value={line.chair ?? (index + 1)}
                          onChange={(e) => updateLineChair(line.key, Number(e.target.value))}
                        >
                          {chairOptionsForTable.map((num) => (
                            <option key={num} value={num}>
                              {formatChair(tableName, num)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        {isEditing ? (
                          <div className="relative">
                            <input
                              type="text"
                              aria-label="Edit item code"
                              className="w-full rounded border border-primary bg-background px-2 py-1 font-mono text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              value={line.code}
                              onChange={(e) => handleInlineCodeChange(line.key, e.target.value)}
                              onFocus={(e) => e.currentTarget.select()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === 'Escape') {
                                  setEditingLineKey(null);
                                }
                              }}
                              list={`inline-code-list-${line.key}`}
                              autoFocus
                            />
                            <datalist id={`inline-code-list-${line.key}`}>
                              {data.menu.map((m) => (
                                <option key={m.id} value={m.code}>
                                  {m.code} - {m.name} ({money(m.price)})
                                </option>
                              ))}
                            </datalist>
                          </div>
                        ) : (
                          <span className="font-mono text-xs">{line.code}</span>
                        )}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{line.name}</span>
                          {isEditing && (
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                              editing
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="grid size-6 cursor-pointer place-items-center rounded border border-border bg-muted/40 text-xs font-bold text-muted-foreground hover:bg-accent hover:text-foreground active:scale-95"
                              onClick={() => {
                                const newQty = Math.max(1, line.quantity - 1);
                                updateLine(line.key, { quantity: newQty });
                              }}
                              title="Decrease quantity"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              max="99"
                              step="1"
                              className="w-12 rounded border border-primary bg-background py-1 text-center font-semibold text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              value={line.quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val) && val > 0 && val <= 99) {
                                  updateLine(line.key, { quantity: val });
                                } else if (e.target.value === '') {
                                  updateLine(line.key, { quantity: 1 });
                                }
                              }}
                              onFocus={(e) => e.currentTarget.select()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === 'Escape') {
                                  setEditingLineKey(null);
                                }
                              }}
                            />
                            <button
                              type="button"
                              className="grid size-6 cursor-pointer place-items-center rounded border border-border bg-muted/40 text-xs font-bold text-muted-foreground hover:bg-accent hover:text-foreground active:scale-95"
                              onClick={() => {
                                const newQty = Math.min(99, line.quantity + 1);
                                updateLine(line.key, { quantity: newQty });
                              }}
                              title="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <span>{formatDecimal(line.quantity)}</span>
                        )}
                      </td>
                      <td className="px-2 py-3">{money(line.price)}</td>
                      <td className="px-2 py-3 font-semibold">{money(line.price * line.quantity)}</td>
                      <td className="px-2 print:hidden">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            aria-label={isEditing ? `Save ${line.name}` : `Edit ${line.name}`}
                            className={`grid size-8 cursor-pointer place-items-center rounded-md transition-colors ${
                              isEditing
                                ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                            }`}
                            onClick={() => setEditingLineKey(isEditing ? null : line.key)}
                            type="button"
                            title={isEditing ? 'Done editing (Enter)' : 'Edit item code & quantity'}
                          >
                            {isEditing ? <Check size={15} /> : <Pencil size={15} />}
                          </button>
                          <button
                            aria-label={`Remove ${line.name}`}
                            className="grid size-8 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-destructive transition-colors"
                            onClick={() => {
                              if (editingLineKey === line.key) setEditingLineKey(null);
                              setLines((current) => current.filter((item) => item.key !== line.key));
                            }}
                            type="button"
                            title="Delete line"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {lines.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center text-sm text-muted-foreground">
                      No items in cart. Select an item from the list or enter code below.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Bottom Total Area with Add GST Scaffold Button */}
          <div className="shrink-0 border-t border-border bg-card print:hidden overflow-hidden">
            <table className="w-full min-w-[760px] table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-[84px]" />
                <col className="w-[120px]" />
                <col />
                <col className="w-[90px]" />
                <col className="w-[110px]" />
                <col className="w-[120px]" />
                <col className="w-[48px]" />
              </colgroup>
              <tbody>
                <tr className="font-semibold text-sm">
                  <td colSpan={2} className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => updateActiveTab((tab) => ({ gstApplied: !tab.gstApplied }))}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                        gstApplied
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-dashed border-border bg-muted/40 text-muted-foreground hover:border-primary hover:bg-accent hover:text-foreground'
                      }`}
                      title="Add GST Tax"
                    >
                      <Plus size={13} />
                      {gstApplied ? `GST Added (${cafeSettings.defaultGstRate ?? 5}%)` : 'Add GST'}
                    </button>
                  </td>
                  <td className="px-2 py-2.5 text-right font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Total
                  </td>
                  <td className="px-2 py-2.5 font-bold text-foreground">
                    {lines.length > 0 ? totalQuantity : '—'}
                  </td>
                  <td className="px-2 py-2.5 text-xs text-muted-foreground">
                    {gstApplied && lines.length > 0 ? `+ GST ${money(gstAmount)}` : ''}
                  </td>
                  <td className="px-2 py-2.5 font-bold text-base text-foreground">
                    {money(total)}
                  </td>
                  <td className="px-2" />
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="flex shrink-0 flex-col border border-border bg-card print:hidden z-20">
        <div
          className="ito-region relative overflow-visible bg-muted/30 p-2"
          {...topology.regionProps('q7.1.3')}
        >
          <TopologyMarker id="q7.1.3" topology={topology} />
          <input type="hidden" name="table_name" value={tableName} />
          <input type="hidden" name="chair" value={chair} />
          <div className="flex min-w-[760px] items-center gap-2 px-2">
            <div className="w-32 shrink-0">
              <span className="ito-region relative block w-full" {...topology.regionProps('q7.1.1')}>
                <TopologyMarker id="q7.1.1" topology={topology} />
                <TypeaheadDropUp<string>
                  inputRef={tableInput}
                  label="Table"
                  value={tableName}
                  options={tableOptions}
                  onChange={setTableName}
                  onSelect={(opt) => {
                    setTableName(opt.data);
                    focusAndSelect(chairInput);
                  }}
                  onEnter={handleTableEnter}
                  onEscape={() => handleEscape(0)}
                  minWidth="w-48"
                />
              </span>
            </div>
            <div className="w-24 shrink-0">
              <TypeaheadDropUp<number>
                inputRef={chairInput}
                label="Chair"
                value={chairInputText ?? formatChair(tableName, chair)}
                options={chairOptions}
                centerText
                onChange={(val) => {
                  setChairInputText(val);
                  let num: number | null = null;
                  if (val.includes('.')) {
                    const parts = val.split('.');
                    const lastPart = parts[parts.length - 1]?.replace(/\D/g, '');
                    if (lastPart) num = parseInt(lastPart, 10);
                  } else {
                    const clean = val.replace(/\D/g, '');
                    if (clean) num = parseInt(clean, 10);
                  }
                  if (num !== null && !isNaN(num) && num >= 1 && num <= tableChairCount) {
                    setChair(String(num));
                  }
                }}
                onSelect={(opt) => {
                  setChair(String(opt.data));
                  setChairInputText(null);
                  focusAndSelect(codeInput);
                }}
                onEnter={handleChairEnter}
                onBlur={() => setChairInputText(null)}
                onEscape={() => handleEscape(1)}
                minWidth="w-36"
              />
            </div>
            <div className="w-32 shrink-0">
              <TypeaheadDropUp<MenuItem>
                inputRef={codeInput}
                label="Item code"
                value={code}
                options={codeOptions}
                onChange={updateCode}
                onSelect={(opt) => {
                  applyLookup(opt.data);
                  focusAndSelect(quantityInput);
                }}
                onEnter={handleCodeEnter}
                onEscape={() => handleEscape(2)}
                minWidth="w-72"
              />
            </div>
            <div className="min-w-0 flex-1">
              <TypeaheadDropUp<MenuItem>
                inputRef={nameInput}
                label="Item name"
                value={name}
                options={nameOptions}
                onChange={updateName}
                onSelect={(opt) => {
                  applyLookup(opt.data);
                  focusAndSelect(quantityInput);
                }}
                onEnter={handleNameEnter}
                onEscape={() => handleEscape(3)}
                minWidth="w-full max-w-md"
              />
            </div>
            <div className="w-24 shrink-0">
              <EntryInput
                inputMode="decimal"
                inputRef={quantityInput}
                label="Qty"
                onChange={setQuantity}
                onKeyDown={(event) => handleEntryKey(event, 4)}
                value={quantity}
              />
            </div>
            <div className="w-28 shrink-0">
              <EntryInput
                inputMode="decimal"
                inputRef={rateInput}
                label="Rate"
                onChange={setRate}
                onKeyDown={(event) => handleEntryKey(event, 5)}
                value={rate}
              />
            </div>
            <div className="w-32 shrink-0">
              <span className="sr-only">Amount</span>
              <output className={`${field} block min-h-10 w-full font-semibold truncate`}>
                {amount ? money(amount) : '—'}
              </output>
            </div>
            <div className="shrink-0">
              <span className="ito-region relative" {...topology.regionProps('q7.1.4')}>
                <TopologyMarker id="q7.1.4" topology={topology} />
                <button
                  aria-label="Add line"
                  className="grid size-10 cursor-pointer place-items-center rounded-lg bg-primary font-semibold text-primary-foreground disabled:cursor-default disabled:opacity-50"
                  disabled={!code.trim() || !name.trim() || !parsedQuantity || !parsedPrice}
                  onClick={addLine}
                  type="button"
                >
                  +
                </button>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3-Inch (80mm) Thermal Roll Bill - renders ONLY when printing */}
      <div className="hidden print:block w-full">
        <ThermalBillReceipt
          settings={cafeSettings}
          tab={activeTab}
          tableName={tableName}
          lines={lines}
          subtotal={subtotal}
          totalQuantity={totalQuantity}
          gstApplied={gstApplied}
          gstAmount={gstAmount}
          total={total}
        />
      </div>

      {/* On-Screen 3-Inch Thermal Receipt Preview Modal */}
      {showReceiptPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 print:hidden"
          onClick={() => setShowReceiptPreview(false)}
        >
          <div
            className="relative flex flex-col max-h-[90vh] w-[340px] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
              <div className="flex items-center gap-2">
                <Receipt className="size-4 text-primary" />
                <span className="font-semibold text-sm">3" Thermal Slip Preview</span>
              </div>
              <button
                type="button"
                onClick={() => setShowReceiptPreview(false)}
                className="grid size-7 cursor-pointer place-items-center rounded-md hover:bg-accent text-muted-foreground transition-colors"
                aria-label="Close preview"
              >
                <X size={15} />
              </button>
            </div>

            {/* Receipt Preview Body with realistic thermal paper look */}
            <div className="flex-1 overflow-y-auto bg-neutral-100 p-4 dark:bg-neutral-900">
              <div className="rounded-lg shadow-md border border-neutral-300 bg-white p-2">
                <ThermalBillReceipt
                  settings={cafeSettings}
                  tab={activeTab}
                  tableName={tableName}
                  lines={lines}
                  subtotal={subtotal}
                  totalQuantity={totalQuantity}
                  gstApplied={gstApplied}
                  gstAmount={gstAmount}
                  total={total}
                />
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div className="flex items-center justify-between border-t border-border bg-card px-4 py-3">
              <span className="text-xs text-muted-foreground font-mono">80mm Thermal Roll</span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => setShowReceiptPreview(false)}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="cursor-pointer gap-1.5"
                  onClick={() => {
                    setShowReceiptPreview(false);
                    requestAnimationFrame(() => window.print());
                  }}
                >
                  <Printer size={14} />
                  Print Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

function EntryInput({
  inputRef,
  inputMode,
  label,
  onChange,
  onKeyDown,
  value,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  inputMode?: 'decimal';
  label: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  value: string;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <input
        ref={inputRef}
        aria-label={label}
        autoComplete="off"
        className={`${field} w-full min-w-0`}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        onKeyDown={onKeyDown}
        placeholder={label}
        type="text"
        value={value}
      />
    </label>
  );
}

type TypeaheadDropUpProps<T> = {
  inputRef: React.RefObject<HTMLInputElement | null>;
  label: string;
  value: string;
  options: AutocompleteOption<T>[];
  onChange: (value: string) => void;
  onSelect: (option: AutocompleteOption<T>) => void;
  onEnter?: () => void;
  onEscape?: () => void;
  onBlur?: () => void;
  autoFocus?: boolean;
  inputMode?: 'text' | 'decimal' | 'numeric';
  className?: string;
  align?: 'left' | 'right';
  minWidth?: string;
  placeholder?: string;
  centerText?: boolean;
};

export function TypeaheadDropUp<T>({
  inputRef,
  label,
  value,
  options,
  onChange,
  onSelect,
  onEnter,
  onEscape,
  onBlur,
  autoFocus,
  inputMode = 'text',
  className = '',
  align = 'left',
  minWidth,
  placeholder,
  centerText = false,
}: TypeaheadDropUpProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);

  const filteredOptions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options;
    const matches = options.filter((opt) => {
      return (
        opt.label.toLowerCase().includes(q) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(q)) ||
        (opt.badge && opt.badge.toLowerCase().includes(q)) ||
        String(opt.id).toLowerCase().includes(q)
      );
    });
    const exact = options.find((opt) => opt.label.toLowerCase() === q || String(opt.id).toLowerCase() === q);
    if (exact && matches.length === 1 && options.length > 1) {
      return options;
    }
    return matches;
  }, [options, value]);

  useEffect(() => {
    if (!isOpen) {
      setActiveIndex(-1);
      return;
    }
    const idx = filteredOptions.findIndex(
      (opt) => opt.label.toLowerCase() === value.trim().toLowerCase() || String(opt.id).toLowerCase() === value.trim().toLowerCase()
    );
    setActiveIndex(idx >= 0 ? idx : filteredOptions.length > 0 ? 0 : -1);
  }, [isOpen, value, filteredOptions]);

  useEffect(() => {
    if (isOpen && activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[activeIndex] as HTMLElement | undefined;
      activeEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [isOpen, activeIndex]);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      if (filteredOptions.length > 0) {
        setActiveIndex((prev) => (prev + 1) % filteredOptions.length);
      }
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      if (filteredOptions.length > 0) {
        setActiveIndex((prev) => (prev <= 0 ? filteredOptions.length - 1 : prev - 1));
      }
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (isOpen && activeIndex >= 0 && filteredOptions[activeIndex]) {
        const selected = filteredOptions[activeIndex]!;
        setIsOpen(false);
        onSelect(selected);
        return;
      }
      if (isOpen && filteredOptions.length > 0) {
        const selected = filteredOptions[0]!;
        setIsOpen(false);
        onSelect(selected);
        return;
      }
      setIsOpen(false);
      onEnter?.();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      if (isOpen) {
        setIsOpen(false);
      } else {
        onEscape?.();
      }
      return;
    }
  }

  return (
    <div className={`relative ${className}`}>
      <label className="block">
        <span className="sr-only">{label}</span>
        <input
          ref={inputRef}
          aria-label={label}
          aria-expanded={isOpen}
          aria-autocomplete="list"
          autoComplete="off"
          autoFocus={autoFocus}
          className={`${field} w-full min-w-0 ${centerText ? 'text-center font-semibold' : ''}`}
          inputMode={inputMode}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={(e) => {
            e.currentTarget.select();
            setIsOpen(true);
          }}
          onBlur={() => {
            setIsOpen(false);
            onBlur?.();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? label}
          type="text"
          value={value}
        />
      </label>
      {isOpen && (
        <div
          className={`absolute bottom-[calc(100%+6px)] z-50 max-h-60 overflow-y-auto scrollbar-slim rounded-lg border border-border bg-popover text-popover-foreground shadow-xl ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${minWidth ?? 'min-w-full w-max max-w-sm'}`}
        >
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">No matches found</div>
          ) : (
            <ul ref={listRef} className="py-1" role="listbox">
              {filteredOptions.map((opt, idx) => {
                const isSelected = idx === activeIndex;
                return (
                  <li
                    key={opt.id}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setIsOpen(false);
                      onSelect(opt);
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-xs transition-colors ${
                      isSelected
                        ? 'bg-accent text-accent-foreground font-medium'
                        : 'hover:bg-accent/50 text-foreground'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {(opt.data as { image?: string })?.image && (
                        <img
                          src={(opt.data as { image?: string }).image}
                          alt=""
                          className="size-6 shrink-0 rounded-md object-cover border border-border"
                        />
                      )}
                      <div className="min-w-0 flex items-baseline gap-1.5 truncate">
                        <span className="font-semibold">{opt.label}</span>
                        {opt.sublabel && (
                          <span className="truncate text-[11px] text-muted-foreground">{opt.sublabel}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {opt.badge && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {opt.badge}
                        </span>
                      )}
                      {opt.meta && (
                        <span className="font-semibold text-primary">{opt.meta}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function focusAndSelect(ref: React.RefObject<HTMLInputElement | null>) {
  ref.current?.focus();
  ref.current?.select();
}

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

function formatDecimal(value: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 }).format(value);
}

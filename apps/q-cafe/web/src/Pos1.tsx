import { useEffect, useMemo, useRef, useState } from 'react';
import { TopologyMarker, type InterfaceTopologyController } from '@codexsun/devkit-ito';
import type { Snapshot } from './api';
import { getMergedMenu, getMergedTables, type CustomMenuItem, type TableMasterConfig } from './mastersStore';
import { ThermalBillReceipt } from './ThermalBillReceipt';
import { loadSettings, type CafeSettings } from './Settings';
import {
  Pos1HeaderSection,
  Pos1ProductSection,
  Pos1BillingSection,
  Pos1CashDrawer,
  Pos1PreviousInvoiceDrawer,
  Pos1ManualEntrySection,
  type EntryLine,
  type OrderTab,
  type OrderMode,
  type PaymentRecord,
  type PreviousBill,
} from './pos1-sections';

type Props = {
  data: Snapshot;
  busy: boolean;
  mutate: (path: string, body: unknown) => Promise<unknown | false>;
  topology: InterfaceTopologyController;
};

export function formatChair(table: string, chair: number | string) {
  const chairStr = String(chair ?? '').trim();
  if (!chairStr || chairStr === '0') return table;
  const match = table.match(/\d+/);
  const prefix = match ? parseInt(match[0], 10) : 'P';
  if (chairStr.includes(',')) {
    const parts = chairStr.split(',').map((p) => p.trim()).filter(Boolean);
    return parts.map((p) => `${prefix}.${p}`).join(', ');
  }
  return `${prefix}.${chairStr}`;
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

function formatRate(priceInPaise: number) {
  return (priceInPaise / 100).toFixed(2);
}

function defaultOrderMode(defaultServiceType: CafeSettings['defaultServiceType']): OrderMode {
  return defaultServiceType === 'Takeaway' ? 'TAKE AWAY' : 'POS';
}

export function Pos1({ data, busy, mutate, topology }: Props) {
  const [cafeSettings, setCafeSettings] = useState<CafeSettings>(() => loadSettings());
  const [printBillNumber, setPrintBillNumber] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const nextTabNum = useRef(2);

  // Tabs state
  const [tabs, setTabs] = useState<OrderTab[]>(() => {
    const defaultTable = loadSettings().defaultServiceType === 'Takeaway' ? 'Parcel' : 'T01';
    return [{
      id: 'tab-1',
      name: 'Order 1',
      tableName: defaultTable,
      chair: '1',
      orderMode: defaultOrderMode(loadSettings().defaultServiceType),
      lines: [],
      gstApplied: false,
    }];
  });
  const [activeTabId, setActiveTabId] = useState('tab-1');

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0]!;
  const lines = activeTab.lines;
  const tableName = activeTab.tableName;
  const chair = activeTab.chair ?? '1';
  const orderMode = activeTab.orderMode;
  const gstApplied = activeTab.gstApplied ?? false;
  const nextBillNumber = String(data.pos.reduce((highestId, bill) => Math.max(highestId, bill.id), 0) + 1);
  const displayedBillNumber = printBillNumber || nextBillNumber;

  // Catalog and master data
  const [menuItems, setMenuItems] = useState<CustomMenuItem[]>(() => getMergedMenu(data.menu));
  const [tableConfigs, setTableConfigs] = useState<TableMasterConfig[]>(() =>
    getMergedTables(data.restaurant_tables)
  );

  // Section 1: Search and Category Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showCashDrawer, setShowCashDrawer] = useState(false);
  const [showPreviousInvoiceDrawer, setShowPreviousInvoiceDrawer] = useState(false);
  const [previousInvoiceIndex, setPreviousInvoiceIndex] = useState(0);
  const [cashReceiptRequest, setCashReceiptRequest] = useState(0);

  // Section 4: Manual entry state (synchronized with selected product card)
  const [selectedItem, setSelectedItem] = useState<CustomMenuItem | null>(null);
  const [bottomQuantity, setBottomQuantity] = useState<string>('1');
  const [bottomCode, setBottomCode] = useState<string>('');
  const [bottomName, setBottomName] = useState<string>('');
  const [bottomRate, setBottomRate] = useState<string>('');

  // Listeners for updates from Settings and Masters
  useEffect(() => {
    const handleMenuUpdate = () => setMenuItems(getMergedMenu(data.menu));
    const handleTablesUpdate = () => setTableConfigs(getMergedTables(data.restaurant_tables));
    const handleSettingsUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<CafeSettings>;
      if (customEvent.detail) setCafeSettings(customEvent.detail);
    };

    window.addEventListener('q-cafe-menu-updated', handleMenuUpdate);
    window.addEventListener('q-cafe-tables-updated', handleTablesUpdate);
    window.addEventListener('q-cafe-settings-updated', handleSettingsUpdate);

    return () => {
      window.removeEventListener('q-cafe-menu-updated', handleMenuUpdate);
      window.removeEventListener('q-cafe-tables-updated', handleTablesUpdate);
      window.removeEventListener('q-cafe-settings-updated', handleSettingsUpdate);
    };
  }, [data.menu, data.restaurant_tables]);

  // Pickup table and chair selection from the touch Tables floor page
  useEffect(() => {
    function applySelectedTable(tableNo: string, chairCount: number | string) {
      setTabs((currentTabs) =>
        currentTabs.map((t) =>
          t.id === activeTabId
            ? { ...t, tableName: tableNo, chair: String(chairCount) }
            : t
        )
      );
      setTimeout(() => {
        if (codeInputRef.current) {
          codeInputRef.current.focus();
          codeInputRef.current.select();
        } else if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 60);
    }

    try {
      const raw = sessionStorage.getItem('q-cafe-selected-table');
      if (raw) {
        sessionStorage.removeItem('q-cafe-selected-table');
        const parsed = JSON.parse(raw);
        if (parsed?.tableNo) {
          const chairVal =
            parsed.chair !== undefined && parsed.chair !== ''
              ? parsed.chair
              : parsed.chairCount
              ? String(parsed.chairCount)
              : '1';
          applySelectedTable(parsed.tableNo, chairVal);
        }
      }
    } catch {
      // Storage unavailable
    }

    const handleTableSelected = (e: Event) => {
      const detail = (
        e as CustomEvent<{
          tableNo: string;
          chair?: string;
          chairCount?: number;
          chairs?: number[];
        }>
      ).detail;
      if (detail?.tableNo) {
        const chairVal =
          detail.chair !== undefined && detail.chair !== ''
            ? detail.chair
            : detail.chairCount
            ? String(detail.chairCount)
            : '1';
        applySelectedTable(detail.tableNo, chairVal);
      }
    };

    window.addEventListener('q-cafe-table-selected', handleTableSelected);
    return () => window.removeEventListener('q-cafe-table-selected', handleTableSelected);
  }, [activeTabId]);

  // Sync active POS orders to sessionStorage and dispatch event for Tables floor status
  useEffect(() => {
    try {
      const activeTables = tabs
        .filter((t) => t.lines.length > 0)
        .map((t) => {
          const chairOccupiedList = Array.from(
            new Set(
              t.lines.flatMap((l) => {
                const cStr = String(l.chair ?? '');
                if (cStr.includes(',')) {
                  return cStr
                    .split(',')
                    .map((c) => parseInt(c.trim(), 10))
                    .filter((n) => !isNaN(n));
                }
                const num = Number(cStr);
                return num > 0 ? [num] : [];
              })
            )
          );
          return {
            tableName: t.tableName,
            chair: t.chair,
            total: t.lines.reduce((s, l) => s + l.price * l.quantity, 0),
            itemCount: t.lines.reduce((s, l) => s + l.quantity, 0),
            chairOccupiedList,
          };
        });
      sessionStorage.setItem('q-cafe-pos-active-tables', JSON.stringify(activeTables));
      window.dispatchEvent(new CustomEvent('q-cafe-pos-tables-updated', { detail: activeTables }));
    } catch {
      // storage unavailable
    }
  }, [tabs]);

  useEffect(() => {
    const handleSettingsUpdated = (e: Event) => {
      const detail = (e as CustomEvent<CafeSettings>).detail;
      if (detail) {
        setCafeSettings(detail);
      }
    };
    window.addEventListener('q-cafe-settings-updated', handleSettingsUpdated);
    return () => window.removeEventListener('q-cafe-settings-updated', handleSettingsUpdated);
  }, []);

  // Tab management
  function updateActiveTab(
    updates: Partial<OrderTab> | ((current: OrderTab) => Partial<OrderTab>)
  ) {
    setTabs((currentTabs) =>
      currentTabs.map((t) => {
        if (t.id !== activeTabId) return t;
        const patch = typeof updates === 'function' ? updates(t) : updates;
        return { ...t, ...patch };
      })
    );
  }

  function createTab() {
    const num = nextTabNum.current++;
    const newId = `tab-${crypto.randomUUID()}`;
    const defaultTable = cafeSettings.defaultServiceType === 'Takeaway' ? 'Parcel' : 'T01';
    const newTab: OrderTab = {
      id: newId,
      name: `Order ${num}`,
      tableName: defaultTable,
      chair: '1',
      orderMode: defaultOrderMode(cafeSettings.defaultServiceType),
      lines: [],
      gstApplied: false,
    };
    setTabs((current) => [...current, newTab]);
    setActiveTabId(newId);
    setShowCashDrawer(false);
    requestAnimationFrame(() => {
      codeInputRef.current?.focus();
      codeInputRef.current?.select();
    });
  }

  useEffect(() => {
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }, []);

  function closeTab(idToClose: string) {
    if (tabs.length <= 1) return;
    setShowCashDrawer(false);
    setTabs((current) => {
      const filtered = current.filter((t) => t.id !== idToClose);
      if (activeTabId === idToClose) {
        setActiveTabId(filtered[0]!.id);
      }
      return filtered;
    });
  }

  // Table and chair configuration
  const currentTableConfig = useMemo(() => {
    return tableConfigs.find((t) => t.tableNo.toLowerCase() === tableName.trim().toLowerCase());
  }, [tableConfigs, tableName]);

  const tableChairCount = currentTableConfig?.chairCount || 4;

  // POS categories always come from the current Item Master catalog.
  const catalogCategories = useMemo(() => [
    'All',
    ...Array.from(new Set(menuItems.map((item) => item.category).filter(Boolean))).sort((left, right) => left.localeCompare(right)),
  ], [menuItems]);

  const manualEntryItems = menuItems;

  useEffect(() => {
    if (!catalogCategories.includes(selectedCategory)) setSelectedCategory('All');
  }, [catalogCategories, selectedCategory]);

  // Filtered product items
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const isItemCodeSearch = /^\d+$/u.test(q);

    return menuItems.filter((item) => {
      const matchesSearch = !q || (
        isItemCodeSearch
          ? item.code.toLowerCase().startsWith(q)
          : item.name.toLowerCase().includes(q) ||
            item.category.toLowerCase().includes(q) ||
            item.code.toLowerCase().startsWith(q)
      );

      const matchesCategory =
        selectedCategory === 'All' ||
        item.category.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [menuItems, searchQuery, selectedCategory]);

  const previousBills = useMemo<PreviousBill[]>(() => {
    const receiptPosIds = new Map(data.receipts.map((receipt) => [receipt.id, receipt.pos_id]));
    const paymentModes = new Map(
      data.receipt_transactions.map((transaction) => [receiptPosIds.get(transaction.receipt_id), transaction.transaction_mode])
    );
    const itemsByBill = new Map<number, typeof data.pos_items>();
    for (const item of data.pos_items) {
      itemsByBill.set(item.pos_id, [...(itemsByBill.get(item.pos_id) ?? []), item]);
    }

    return data.pos
      .filter((bill) => bill.status === 'paid')
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
      .map((bill) => ({
        id: bill.id,
        billNo: bill.bill_no,
        tableNo: bill.table_no,
        total: bill.grand_total,
        collectedAt: new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(`${bill.created_at}Z`)),
        paidWithCash: paymentModes.get(bill.id) === 'cash',
        paymentMode: (paymentModes.get(bill.id) ?? 'paid').toUpperCase(),
        items: (itemsByBill.get(bill.id) ?? []).map((item) => ({ name: item.item_name, quantity: item.quantity, rate: item.rate, amount: item.amount })),
      }));
  }, [data.pos, data.pos_items, data.receipt_transactions, data.receipts]);
  const selectedPreviousInvoice = previousBills[previousInvoiceIndex];
  // Cart financial calculations
  const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  const gstRateMultiplier = (cafeSettings.defaultGstRate ?? 5) / 100;
  const gstAmount = gstApplied ? Math.round(subtotal * gstRateMultiplier) : 0;
  const total = subtotal + gstAmount;

  // Cart line operations
  function handleIncrementLine(lineKey: string) {
    updateActiveTab((tab) => ({
      lines: tab.lines.map((l) => (l.key === lineKey ? { ...l, quantity: l.quantity + 1 } : l)),
    }));
  }

  function handleDecrementLine(lineKey: string) {
    updateActiveTab((tab) => ({
      lines: tab.lines.map((line) =>
        line.key === lineKey
          ? { ...line, quantity: Math.max(1, line.quantity - 1) }
          : line
      ),
    }));
  }

  function handleRemoveLine(lineKey: string) {
    updateActiveTab((tab) => ({
      lines: tab.lines.filter((l) => l.key !== lineKey),
    }));
  }

  function handleClearUnsavedOrder() {
    updateActiveTab({ lines: [], payment: null, gstApplied: false });
    setSelectedItem(null);
    setBottomCode('');
    setBottomName('');
    setBottomQuantity('1');
    setBottomRate('');
    setShowCashDrawer(false);
    setPrintBillNumber('');
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    });
  }

  function handleOrderModeChange(nextMode: OrderMode) {
    const wasTakeaway = tableName.toLowerCase() === 'parcel' || tableName.toLowerCase() === 'takeaway';
    updateActiveTab({
      orderMode: nextMode,
      tableName: nextMode === 'TAKE AWAY' ? 'Parcel' : wasTakeaway ? 'T01' : tableName,
      chair: nextMode === 'TAKE AWAY' ? '1' : chair,
    });
  }

  // Section 2: Card selection & Add-to-cart
  function handleSelectAndAddCard(item: CustomMenuItem) {
    handleApplyItem(item);

    // Add to cart directly
    const targetChair = chair || '1';
    updateActiveTab((tab) => {
      const existingIndex = tab.lines.findIndex(
        (l) => l.code.toUpperCase() === item.code.toUpperCase() && String(l.chair ?? '1') === String(targetChair)
      );

      if (existingIndex >= 0) {
        return {
          lines: tab.lines.map((l, idx) =>
            idx === existingIndex ? { ...l, quantity: l.quantity + 1 } : l
          ),
        };
      }

      const newLine: EntryLine = {
        key: `line-${crypto.randomUUID()}`,
        menuId: item.id,
        code: item.code,
        name: item.name,
        quantity: 1,
        price: item.price,
        chair: targetChair,
        image: item.image,
      };
      return {
        lines: [...tab.lines, newLine],
      };
    });
  }

  // Section 4: Bottom bar "Add to Order" action
  function handleBottomAddOrder() {
    const cleanCode = bottomCode.trim();
    const cleanName = bottomName.trim();
    if (!cleanName && !cleanCode) {
      codeInputRef.current?.focus();
      return;
    }

    const qty = parseQuantity(bottomQuantity);
    const finalQty = qty > 0 ? qty : 1;
    const prc = parsePrice(bottomRate);
    const matchedItem =
      menuItems.find((item) => item.code.toLowerCase() === cleanCode.toLowerCase()) ??
      manualEntryItems.find((item) => cleanName && item.name.toLowerCase() === cleanName.toLowerCase());
    const finalPrice = prc > 0 ? prc : (matchedItem?.price ?? 10000);
    const finalCode = cleanCode || matchedItem?.code || 'ITM-000';
    const finalName = cleanName || matchedItem?.name || 'Custom Item';

    const targetChair = chair || '1';
    const existingIndex = lines.findIndex(
      (l) => l.code.toUpperCase() === finalCode.toUpperCase() && String(l.chair ?? '1') === String(targetChair)
    );

    if (existingIndex >= 0) {
      updateActiveTab((tab) => ({
        lines: tab.lines.map((l, idx) =>
          idx === existingIndex ? { ...l, quantity: l.quantity + finalQty } : l
        ),
      }));
    } else {
      const newLine: EntryLine = {
        key: `line-${crypto.randomUUID()}`,
        menuId: matchedItem?.id ?? selectedItem?.id,
        code: finalCode,
        name: finalName,
        quantity: finalQty,
        price: finalPrice,
        chair: targetChair,
        image: matchedItem?.image ?? selectedItem?.image,
      };
      updateActiveTab((tab) => ({
        lines: [...tab.lines, newLine],
      }));
    }

    // Advance chair only if single numeric chair (do not break grouped chairs)
    if (!chair.includes(',')) {
      const currentChair = Number(chair) || 1;
      const maxChairs = tableChairCount || 4;
      const nextChair = currentChair >= maxChairs ? 1 : currentChair + 1;
      updateActiveTab({ chair: String(nextChair) });
    }

    // Reset entry inputs for rapid sequential billing
    setBottomCode('');
    setBottomName('');
    setBottomQuantity('1');
    setBottomRate('');
    setSelectedItem(null);
    requestAnimationFrame(() => {
      codeInputRef.current?.focus();
      codeInputRef.current?.select();
    });
  }

  // Section 4: Field updates with auto-lookup
  function handleItemCodeChange(val: string) {
    setBottomCode(val);
    const matched = menuItems.find((item) => item.code.toLowerCase() === val.trim().toLowerCase());
    if (matched) {
      setSelectedItem(matched);
      setBottomName(matched.name);
      setBottomRate(formatRate(matched.price));
    }
  }

  function handleApplyItem(item: CustomMenuItem) {
    setSelectedItem(item);
    setBottomCode(item.code);
    setBottomName(item.name);
    setBottomRate(formatRate(item.price));
    setBottomQuantity('1');
  }

  // Section 3: Send to kitchen
  async function handleSendToKitchen() {
    if (!lines.length || busy) return;

    let apiTable = tableName.trim();
    let tablePrefix = '';
    if (apiTable.toLowerCase() === 'parcel' || apiTable.toLowerCase() === 'takeaway') {
      apiTable = 'Takeaway';
    } else if (!/^T(0[1-9]|1[0-2])$/.test(apiTable)) {
      const match = apiTable.match(/\d+/);
      const num = match ? parseInt(match[0], 10) : 12;
      apiTable = `T${String(Math.min(12, Math.max(1, ((num - 1) % 12) + 1))).padStart(2, '0')}`;
      tablePrefix = `[${tableName}] `;
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
      setShowCashDrawer(false);
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
          orderMode: defaultOrderMode(cafeSettings.defaultServiceType),
          lines: [],
          gstApplied: false,
        });
      }
    }
  }

  // Section 5: Payment handling
  function handleRecordPayment(pay: PaymentRecord) {
    updateActiveTab({ payment: pay });
  }

  function handleClearPayment() {
    updateActiveTab({ payment: null });
  }

  function handleCashReceipt() {
    setCashReceiptRequest((request) => request + 1);
    setShowCashDrawer(true);
  }

  // Section 6: Confirm order (Post POS bill + Payment receipt to backend, clear table, print slip, advance to next order)
  async function handleConfirmOrder() {
    if (!lines.length || busy) return;

    let tableId: number | null = null;
    let apiTableNo = tableName.trim();
    const isTakeaway = apiTableNo.toLowerCase().includes('parcel') || apiTableNo.toLowerCase().includes('takeaway');

    if (isTakeaway) {
      apiTableNo = 'Takeaway';
      tableId = null;
    } else {
      const match = data.restaurant_tables.find(
        (t) => t.table_no.toLowerCase() === apiTableNo.toLowerCase()
      );
      if (match) {
        tableId = match.id;
        apiTableNo = match.table_no;
      } else if (data.restaurant_tables.length > 0) {
        const avail = data.restaurant_tables.find((t) => t.status === 'available') || data.restaurant_tables[0]!;
        tableId = avail.id;
        apiTableNo = avail.table_no;
      }
    }

    const gstPercent = gstApplied ? (cafeSettings.defaultGstRate ?? 5) : 0;
    const posLines = lines.map((l) => ({
      menu_id: l.menuId ?? 1,
      item_code: l.code,
      item_name: l.name,
      quantity: l.quantity,
      rate: l.price,
    }));

    const maxChairs = tableChairCount || 4;
    const guestCount = activeTab.chair.includes(',')
      ? activeTab.chair.split(',').length
      : parseInt(activeTab.chair, 10) || 1;
    const currentGuests = Math.min(Math.max(guestCount, 1), Math.max(maxChairs, 1));

    // 1. Post POS bill to backend database
    const createdBill = (await mutate('/pos', {
      table_id: tableId,
      table_no: apiTableNo,
      guest_count: currentGuests,
      gst_percent: gstPercent,
      lines: posLines,
    })) as { id: number; bill_no: string; grand_total: number } | false;

    if (!createdBill || typeof createdBill !== 'object' || !('id' in createdBill)) {
      return;
    }
    setPrintBillNumber(createdBill.bill_no);

    // 2. Post payment receipt (settles bill & automatically marks table as available)
    const payment = activeTab.payment;
    const paymentMode = payment?.mode || 'cash';
    const denominations = payment?.denominations ? JSON.stringify(payment.denominations) : null;
    const referenceNo = payment?.referenceNo || '-';

    await mutate('/receipts', {
      pos_id: createdBill.id,
      transactions: [
        {
          transaction_mode: paymentMode,
          amount: createdBill.grand_total,
          denominations,
          settlement_nature: 'collection',
          reference_no: referenceNo,
        },
      ],
    });

    // 3. Wait for the saved bill number to render, then print the thermal receipt.
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    window.print();
    setPrintBillNumber('');

    // 4. Advance to next order / reset tab
    if (tabs.length > 1) {
      closeTab(activeTabId);
    } else {
      const defaultTable = cafeSettings.defaultServiceType === 'Takeaway' ? 'Parcel' : 'T01';
      const num = nextTabNum.current++;
      updateActiveTab({
        name: `Order ${num}`,
        tableName: defaultTable,
        chair: '1',
        orderMode: defaultOrderMode(cafeSettings.defaultServiceType),
        lines: [],
        gstApplied: false,
        payment: null,
      });
    }
    setShowCashDrawer(false);
    requestAnimationFrame(() => {
      codeInputRef.current?.focus();
      codeInputRef.current?.select();
    });
  }

  function handleNextOrder() {
    if (lines.length > 0) {
      void handleConfirmOrder();
      return;
    }
    if (tabs.length > 1) {
      closeTab(activeTabId);
    } else {
      const defaultTable = cafeSettings.defaultServiceType === 'Takeaway' ? 'Parcel' : 'T01';
      const num = nextTabNum.current++;
      updateActiveTab({
        name: `Order ${num}`,
        tableName: defaultTable,
        chair: '1',
        orderMode: defaultOrderMode(cafeSettings.defaultServiceType),
        lines: [],
        gstApplied: false,
        payment: null,
      });
    }
    setShowCashDrawer(false);
    requestAnimationFrame(() => {
      codeInputRef.current?.focus();
      codeInputRef.current?.select();
    });
  }

  // Auto-focus floating next order button when order is paid
  useEffect(() => {
    if (activeTab.payment && !showCashDrawer) {
      requestAnimationFrame(() => {
        nextButtonRef.current?.focus();
      });
    }
  }, [activeTab.payment, showCashDrawer]);

  // Global Keyboard Shortcuts (F1: order mode, F2: search, F3: item code, F6: cash receipt, F7: previous bills, F8: save)
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Enter on paid order -> Next Order / Confirm
      if (e.key === 'Enter' && activeTab.payment && !showCashDrawer) {
        const activeEl = document.activeElement;
        const isEditingOtherInput =
          activeEl === searchInputRef.current ||
          activeEl === codeInputRef.current ||
          activeEl === quantityInputRef.current;

        if (!isEditingOtherInput) {
          e.preventDefault();
          handleNextOrder();
          return;
        }
      }
      // Escape: close the cash drawer if it is open.
      if (e.key === 'Escape' && showCashDrawer) {
        e.preventDefault();
        setShowCashDrawer(false);
        return;
      }
      // F1: cycle POS, KOT, and take-away modes.
      if (e.key === 'F1') {
        e.preventDefault();
        const modes: OrderMode[] = ['POS', 'KOT', 'TAKE AWAY'];
        const currentIndex = modes.indexOf(orderMode);
        handleOrderModeChange(modes[(currentIndex + 1) % modes.length]!);
      }
      // F2: focus search
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      // F3: focus Item Code.
      if (e.key === 'F3') {
        e.preventDefault();
        codeInputRef.current?.focus();
        codeInputRef.current?.select();
      }
      // F6: open the cash receipt form in the right-side drawer.
      if (e.key === 'F6') {
        e.preventDefault();
        handleCashReceipt();
      }
      // F7: open previous bills.
      if (e.key === 'F7') {
        e.preventDefault();
        setPreviousInvoiceIndex(0);
        setShowPreviousInvoiceDrawer(true);
      }
      if (showPreviousInvoiceDrawer && e.key === 'PageUp') {
        e.preventDefault();
        setPreviousInvoiceIndex((index) => Math.min(index + 1, Math.max(previousBills.length - 1, 0)));
      }
      if (showPreviousInvoiceDrawer && e.key === 'PageDown') {
        e.preventDefault();
        setPreviousInvoiceIndex((index) => Math.max(index - 1, 0));
      }
      // Alt+I is an alternate Item Code shortcut.
      if (e.altKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        codeInputRef.current?.focus();
        codeInputRef.current?.select();
      }
      // Alt+Q: focus Quantity
      if (e.altKey && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        quantityInputRef.current?.focus();
        quantityInputRef.current?.select();
      }
      // Ctrl+Enter: send to kitchen
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (lines.length > 0 && !busy) {
          void handleSendToKitchen();
        }
      }
      // F8: confirm & print bill
      if (e.key === 'F8') {
        e.preventDefault();
        if (lines.length > 0 && !busy) {
          void handleConfirmOrder();
        }
      }
      // Alt+N: new order tab
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        createTab();
      }
      // Alt+1 to Alt+9: switch order tab
      if (e.altKey && /^[1-9]$/.test(e.key)) {
        const tabIndex = parseInt(e.key, 10) - 1;
        if (tabs[tabIndex]) {
          e.preventDefault();
          setActiveTabId(tabs[tabIndex].id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lines.length, busy, activeTabId, tabs, tableName, cafeSettings, showCashDrawer, showPreviousInvoiceDrawer, previousBills.length, activeTab.payment, gstApplied, activeTab.chair, orderMode, data.restaurant_tables]);

  return (
    <div
      className="ito-region flex flex-1 flex-col h-full min-h-0 bg-background text-foreground select-none print:block print:min-h-0 print:p-0 print:m-0"
      {...topology.regionProps('q12')}
    >
      <TopologyMarker id="q12" topology={topology} />

      {/* Top Header (Full-width across POS-1 workspace) */}
      <Pos1HeaderSection
        topology={topology}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchInputRef={searchInputRef}
        onFirstItemPick={() => {
          if (searchQuery.trim() && filteredItems.length > 0) {
            handleSelectAndAddCard(filteredItems[0]!);
            requestAnimationFrame(() => {
              searchInputRef.current?.focus();
              searchInputRef.current?.select();
            });
          }
        }}
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={(tabId) => {
          setActiveTabId(tabId);
           setShowCashDrawer(false);
        }}
        onCreateTab={createTab}
        onCloseTab={closeTab}
        linesCount={lines.length}
        busy={busy}
        onPrintBill={handleConfirmOrder}
        onSendToKitchen={handleSendToKitchen}
        showOrderTabs={Boolean(cafeSettings.showOrderTabs)}
        showKitchenButton={Boolean(cafeSettings.showKitchenButton)}
      />

      {/* Main Content Area (Split: Left Catalog Column [Categories + Product Cards] + Right Billing Cart Panel) */}
      <div className="flex flex-1 min-h-0 gap-4 p-3 print:hidden">
        {/* Left Column: Category Filter Pills + Product Catalog Cards Grid */}
        <Pos1ProductSection
          topology={topology}
          items={filteredItems}
          selectedItem={selectedItem}
          onSelectItem={handleSelectAndAddCard}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          categories={catalogCategories}
        />

        {/* Right Column: Billing Cart Panel (below header) */}
        <Pos1BillingSection
          topology={topology}
          activeTab={activeTab}
          tableName={tableName}
          lines={lines}
          subtotal={subtotal}
          totalQuantity={totalQuantity}
          total={total}
          orderMode={orderMode}
          onChangeOrderMode={handleOrderModeChange}
          onClearUnsavedOrder={handleClearUnsavedOrder}
          onIncrementLine={handleIncrementLine}
          onDecrementLine={handleDecrementLine}
          onRemoveLine={handleRemoveLine}
          formatChair={formatChair}
          onNextOrder={handleNextOrder}
          nextButtonRef={nextButtonRef}
        />
      </div>

      <Pos1CashDrawer
        open={showCashDrawer}
        onOpenChange={setShowCashDrawer}
        linesCount={lines.length}
        total={total}
        payment={activeTab.payment}
        cashReceiptRequest={cashReceiptRequest}
        onRecordPayment={handleRecordPayment}
        onClearPayment={handleClearPayment}
      />

      <Pos1PreviousInvoiceDrawer
        open={showPreviousInvoiceDrawer}
        onOpenChange={setShowPreviousInvoiceDrawer}
        invoice={selectedPreviousInvoice}
        invoiceNumber={previousInvoiceIndex + 1}
        invoiceCount={previousBills.length}
        onOlderInvoice={() => setPreviousInvoiceIndex((index) => Math.min(index + 1, Math.max(previousBills.length - 1, 0)))}
        onNewerInvoice={() => setPreviousInvoiceIndex((index) => Math.max(index - 1, 0))}
      />

      {/* Section 4: Manual Entry Area (Bottom Fast Strip) */}
      <Pos1ManualEntrySection
        topology={topology}
        itemCode={bottomCode}
        itemName={bottomName}
        quantity={bottomQuantity}
        menuItems={manualEntryItems}
        onChangeItemCode={handleItemCodeChange}
        onChangeQuantity={setBottomQuantity}
        onApplyItem={handleApplyItem}
        onAddToOrder={handleBottomAddOrder}
        codeInputRef={codeInputRef}
        quantityInputRef={quantityInputRef}
      />

      {/* 3-Inch Thermal Receipt Node (Shown strictly on print) */}
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
        payment={activeTab.payment}
        billNumber={displayedBillNumber}
        className="hidden print:block thermal-receipt"
      />
    </div>
  );
}

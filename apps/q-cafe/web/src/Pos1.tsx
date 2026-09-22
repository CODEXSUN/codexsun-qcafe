import { useEffect, useMemo, useRef, useState } from 'react';
import { TopologyMarker, type InterfaceTopologyController } from '@codexsun/devkit-ito';
import type { Snapshot } from './api';
import { getMergedMenu, getMergedTables, type CustomMenuItem, type TableMasterConfig } from './mastersStore';
import { loadSettings, type CafeSettings } from './Settings';
import { directPrintKot, directPrintReceipt } from './rawReceipt';
import {
  Pos1HeaderSection,
  Pos1ProductSection,
  Pos1BillingSection,
  Pos1BillsDrawer,
  Pos1PreviousBillsDrawer,
  Pos1ManualEntrySection,
  type EntryLine,
  type OrderTab,
  type OrderMode,
  type PaymentRecord,
} from './pos1-sections';

type Props = {
  data: Snapshot;
  busy: boolean;
  mutate: (path: string, body: unknown) => Promise<unknown | false>;
  topology: InterfaceTopologyController;
};

type PendingBill = {
  id: number;
  billNumber: string;
  grandTotal: number;
};

function isWarningNotice(message: string) {
  return /\b(failed|unpaid|disabled|could not|error)\b/i.test(message);
}

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

function defaultTableName(settings: CafeSettings, tables: Snapshot['restaurant_tables']) {
  if (settings.defaultServiceType === 'Takeaway') return 'Parcel';
  return tables.find((table) => table.status === 'available')?.table_no ?? tables[0]?.table_no ?? 'Parcel';
}

export function Pos1({ data, busy, mutate, topology }: Props) {
  const [cafeSettings, setCafeSettings] = useState<CafeSettings>(() => loadSettings());
  const [printNotice, setPrintNotice] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const nextTabNum = useRef(2);

  // Tabs state
  const [tabs, setTabs] = useState<OrderTab[]>(() => {
    const initialSettings = loadSettings();
    const defaultTable = defaultTableName(initialSettings, data.restaurant_tables);
    return [{
      id: 'tab-1',
      name: 'Order 1',
      tableName: defaultTable,
      chair: '1',
      orderMode: defaultTable === 'Parcel' ? 'TAKE AWAY' : defaultOrderMode(initialSettings.defaultServiceType),
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
  const lastBill = data.pos.slice().sort((a, b) => b.id - a.id)[0];
  const todaySpecialEnabled = data.master_settings.some(
    (setting) => setting.key === 'today_special_enabled' && setting.value === 'true'
  );
  const selectedTodaySpecialPrefix = data.master_settings.find(
    (setting) => setting.key === 'today_special_selected_prefix'
  )?.value.trim().toUpperCase();
  const activeSpecialPrefix = todaySpecialEnabled ? selectedTodaySpecialPrefix : undefined;

  // Catalog and master data
  const [menuItems, setMenuItems] = useState<CustomMenuItem[]>(() => getMergedMenu(data.menu, activeSpecialPrefix));
  const [tableConfigs, setTableConfigs] = useState<TableMasterConfig[]>(() =>
    getMergedTables(data.restaurant_tables)
  );

  // Section 1: Search and Category Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showPaymentCollector, setShowPaymentCollector] = useState(false);
  const [showReceiptDrawer, setShowReceiptDrawer] = useState(false);
  const [showPreviousBillsDrawer, setShowPreviousBillsDrawer] = useState(false);
  const [selectedPreviousBillId, setSelectedPreviousBillId] = useState<number | null>(null);
  const [pendingBill, setPendingBill] = useState<PendingBill | null>(null);

  // Section 4: Manual entry state (synchronized with selected product card)
  const [selectedItem, setSelectedItem] = useState<CustomMenuItem | null>(null);
  const [bottomQuantity, setBottomQuantity] = useState<string>('1');
  const [bottomCode, setBottomCode] = useState<string>('');
  const [bottomName, setBottomName] = useState<string>('');
  const [bottomRate, setBottomRate] = useState<string>('');

  // Listeners for updates from Settings and Masters
  useEffect(() => {
    const handleMenuUpdate = () => setMenuItems(getMergedMenu(data.menu, activeSpecialPrefix));
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
  }, [activeSpecialPrefix, data.menu, data.restaurant_tables]);

  useEffect(() => {
    if (data.restaurant_tables.length > 0) return;
    setTabs((currentTabs) => currentTabs.map((tab) => (
      tab.tableName.toLowerCase() === 'parcel' || tab.tableName.toLowerCase() === 'takeaway'
        ? tab
        : { ...tab, tableName: 'Parcel', chair: '1', orderMode: 'TAKE AWAY' }
    )));
  }, [data.restaurant_tables.length]);

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
    const defaultTable = defaultTableName(cafeSettings, data.restaurant_tables);
    const newTab: OrderTab = {
      id: newId,
      name: `Order ${num}`,
      tableName: defaultTable,
      chair: '1',
      orderMode: defaultTable === 'Parcel' ? 'TAKE AWAY' : defaultOrderMode(cafeSettings.defaultServiceType),
      lines: [],
      gstApplied: false,
    };
    setTabs((current) => [...current, newTab]);
    setActiveTabId(newId);
    setShowPaymentCollector(false);
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
    setShowPaymentCollector(false);
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
            item.code.toLowerCase().startsWith(q) ||
            Boolean(item.activeSpecial && (
              item.activeSpecial.prefix.toLowerCase().includes(q) || item.activeSpecial.name.toLowerCase().includes(q)
            ))
      );

      const matchesCategory =
        selectedCategory === 'All' ||
        item.category.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [menuItems, searchQuery, selectedCategory]);

  // Cart financial calculations
  const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  const gstRateMultiplier = (cafeSettings.defaultGstRate ?? 5) / 100;
  const gstAmount = gstApplied ? Math.round(subtotal * gstRateMultiplier) : 0;
  const total = subtotal + gstAmount;
  const settlementTotal = pendingBill?.grandTotal ?? total;

  // Cart line operations
  function handleIncrementLine(lineKey: string) {
    if (pendingBill) return;
    updateActiveTab((tab) => ({
      lines: tab.lines.map((l) => (l.key === lineKey ? { ...l, quantity: l.quantity + 1 } : l)),
    }));
  }

  function handleDecrementLine(lineKey: string) {
    if (pendingBill) return;
    updateActiveTab((tab) => ({
      lines: tab.lines.map((line) =>
        line.key === lineKey
          ? { ...line, quantity: Math.max(1, line.quantity - 1) }
          : line
      ),
    }));
  }

  function handleRemoveLine(lineKey: string) {
    if (pendingBill) return;
    updateActiveTab((tab) => ({
      lines: tab.lines.filter((l) => l.key !== lineKey),
    }));
  }

  function handleClearUnsavedOrder() {
    if (pendingBill) return;
    updateActiveTab({ lines: [], payment: null, gstApplied: false });
    setSelectedItem(null);
    setBottomCode('');
    setBottomName('');
    setBottomQuantity('1');
    setBottomRate('');
    setShowPaymentCollector(false);
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    });
  }

  function handleOrderModeChange(nextMode: OrderMode) {
    if (pendingBill) return;
    const wasTakeaway = tableName.toLowerCase() === 'parcel' || tableName.toLowerCase() === 'takeaway';
    updateActiveTab({
      orderMode: nextMode,
      tableName: nextMode === 'TAKE AWAY' ? 'Parcel' : wasTakeaway ? defaultTableName(cafeSettings, data.restaurant_tables) : tableName,
      chair: nextMode === 'TAKE AWAY' ? '1' : chair,
    });
  }

  // Section 2: Card selection & Add-to-cart
  function handleSelectAndAddCard(item: CustomMenuItem) {
    if (pendingBill) return;
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
    if (pendingBill) return;
    const cleanCode = bottomCode.trim();
    const cleanName = bottomName.trim();
    if (!cleanName && !cleanCode) {
      codeInputRef.current?.focus();
      return;
    }

    const qty = parseQuantity(bottomQuantity);
    const finalQty = qty > 0 ? qty : 1;
    const prc = parsePrice(bottomRate);
    const matchedItem = menuItems.find(
      (m) =>
        (cleanCode && m.code.toLowerCase() === cleanCode.toLowerCase()) ||
        (cleanName && m.name.toLowerCase() === cleanName.toLowerCase())
    );
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
    if (pendingBill) return;
    setBottomCode(val);
    const matched = menuItems.find((m) => m.code.toLowerCase() === val.trim().toLowerCase());
    if (matched) {
      setSelectedItem(matched);
      setBottomName(matched.name);
      setBottomRate(formatRate(matched.price));
    }
  }

  function handleApplyItem(item: CustomMenuItem) {
    if (pendingBill) return;
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
      if (cafeSettings.directKotPrint) {
        try {
          const kitchenOrder = sent as { id?: number };
          const printResult = await directPrintKot({
            settings: cafeSettings,
            kotNumber: kitchenOrder.id ? String(kitchenOrder.id) : 'NEW',
            tableName: tableName.trim() || apiTable,
            lines,
          });
          setPrintNotice(printResult.queued ? 'KOT sent directly to the kitchen printer.' : `Windows opened the ${printResult.printer} save dialog for the KOT.`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error('Direct KOT printing failed:', error);
          setPrintNotice(`Kitchen order was saved, but KOT printing failed. ${message}`);
        }
      } else {
        setPrintNotice('Kitchen order was saved. KOT printing is disabled in Printer & Receipts Settings.');
      }
      setShowPaymentCollector(false);
      if (tabs.length > 1) {
        closeTab(activeTabId);
      } else {
        const defaultTable = defaultTableName(cafeSettings, data.restaurant_tables);
        updateActiveTab({
          tableName: defaultTable,
          chair: '1',
          orderMode: defaultTable === 'Parcel' ? 'TAKE AWAY' : defaultOrderMode(cafeSettings.defaultServiceType),
          lines: [],
          gstApplied: false,
        });
      }
    }
  }

  // Section 5: Payment handling
  async function handleRecordPayment(pay: PaymentRecord) {
    if (pendingBill) {
      const receipt = await mutate('/receipts', {
        pos_id: pendingBill.id,
        transactions: [{
          transaction_mode: pay.mode,
          amount: pendingBill.grandTotal,
          denominations: pay.denominations ? JSON.stringify(pay.denominations) : null,
          settlement_nature: 'collection',
          reference_no: pay.referenceNo || '-',
        }],
      });
      if (!receipt) return;
      setPrintNotice(`Payment recorded for bill ${pendingBill.billNumber}. Ready for a new order.`);
      setPendingBill(null);
      setShowPaymentCollector(false);
      setShowReceiptDrawer(false);
      advanceToNextOrder();
      return;
    }
    updateActiveTab({ payment: pay });
    setShowPaymentCollector(false);
    setShowReceiptDrawer(false);
    void handleConfirmOrder(pay);
  }

  function handleClearPayment() {
    updateActiveTab({ payment: null });
    setShowPaymentCollector(true);
  }

  function handleSkipPayment() {
    if (pendingBill) {
      setShowPaymentCollector(false);
      setShowReceiptDrawer(false);
      setPrintNotice(`Bill ${pendingBill.billNumber} remains unpaid. Press F6 when the customer is ready to pay.`);
      return;
    }
    updateActiveTab({ payment: null });
    setShowPaymentCollector(false);
    setShowReceiptDrawer(false);
    void handleConfirmOrder(null);
  }

  function handleClosePaymentCollector() {
    setShowPaymentCollector(false);
  }

  function handleFocusPayment() {
    setShowPreviousBillsDrawer(false);
    setShowReceiptDrawer(true);
    setShowPaymentCollector(Boolean(pendingBill) || lines.length > 0);
  }

  function handleOpenPreviousBills() {
    const latestBill = data.pos.slice().sort((left, right) => right.id - left.id)[0];
    setShowReceiptDrawer(false);
    setShowPaymentCollector(false);
    setSelectedPreviousBillId((current) => current ?? latestBill?.id ?? null);
    setShowPreviousBillsDrawer(true);
  }

  function movePreviousBill(direction: 1 | -1) {
    const previousBills = data.pos.slice().sort((left, right) => right.id - left.id);
    if (previousBills.length === 0) return;
    const currentIndex = previousBills.findIndex((bill) => bill.id === selectedPreviousBillId);
    const nextIndex = currentIndex < 0
      ? 0
      : Math.min(Math.max(currentIndex + direction, 0), previousBills.length - 1);
    setSelectedPreviousBillId(previousBills[nextIndex]!.id);
  }

  function advanceToNextOrder() {
    if (tabs.length > 1) {
      closeTab(activeTabId);
    } else {
      const defaultTable = defaultTableName(cafeSettings, data.restaurant_tables);
      const num = nextTabNum.current++;
      updateActiveTab({
        name: `Order ${num}`,
        tableName: defaultTable,
        chair: '1',
        orderMode: defaultTable === 'Parcel' ? 'TAKE AWAY' : defaultOrderMode(cafeSettings.defaultServiceType),
        lines: [],
        gstApplied: false,
        payment: null,
      });
    }
    requestAnimationFrame(() => {
      codeInputRef.current?.focus();
      codeInputRef.current?.select();
    });
  }

  async function sendBillToPrinter(
    bill: { bill_no: string; grand_total: number },
    apiTableNo: string,
    paymentMode: string,
  ) {
    try {
      const printResult = await directPrintReceipt({
        settings: cafeSettings,
        billNumber: bill.bill_no,
        tableName: apiTableNo,
        lines,
        subtotal,
        gstAmount,
        total: bill.grand_total,
        paymentMode,
      });
      setPrintNotice(printResult.queued ? 'Receipt sent directly to printer.' : `Windows opened the ${printResult.printer} save dialog.`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Direct receipt printing failed:', error);
      setPrintNotice(`Direct print failed. Bill was saved. ${errorMsg}`);
    }
  }

  // F8 saves and prints an unpaid customer bill. Collection happens afterward in the receipt drawer.
  async function handleSaveAndPrintBill() {
    if (!lines.length || busy || pendingBill) return;
    await handleConfirmOrder(null, { printUnpaidBill: true, keepOrderOpen: true });
  }

  async function handleConfirmOrder(
    paymentOverride?: PaymentRecord | null,
    options: { printUnpaidBill?: boolean; keepOrderOpen?: boolean } = {},
  ) {
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
    // A bill without a recorded payment remains open. It can be settled later.
    const payment = paymentOverride === undefined ? activeTab.payment : paymentOverride;
    if (payment) {
      const receipt = await mutate('/receipts', {
        pos_id: createdBill.id,
        transactions: [
          {
            transaction_mode: payment.mode,
            amount: createdBill.grand_total,
            denominations: payment.denominations ? JSON.stringify(payment.denominations) : null,
            settlement_nature: 'collection',
            reference_no: payment.referenceNo || '-',
          },
        ],
      });
      if (!receipt) return;
      if (cafeSettings.directPrint) await sendBillToPrinter(createdBill, apiTableNo, payment.mode);
      else setPrintNotice('Receipt saved. Direct printing is disabled.');
    }

    if (options.printUnpaidBill) await sendBillToPrinter(createdBill, apiTableNo, 'unpaid');
    if (options.keepOrderOpen) {
      setPendingBill({ id: createdBill.id, billNumber: createdBill.bill_no, grandTotal: createdBill.grand_total });
      setShowReceiptDrawer(true);
      setShowPaymentCollector(true);
      return;
    }

    setShowPaymentCollector(false);
    advanceToNextOrder();
  }

  // Global keyboard shortcuts keep receipt settlement and passed-bill review separate.
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Escape: close payment sheet if open
      if (e.key === 'Escape' && showPaymentCollector) {
        e.preventDefault();
        setShowPaymentCollector(false);
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
      // F7: open the passed-bills drawer. Page Up and Page Down move through bills.
      if (e.key === 'F7') {
        e.preventDefault();
        handleOpenPreviousBills();
        return;
      }
      if (showPreviousBillsDrawer && (e.key === 'PageUp' || e.key === 'PageDown')) {
        e.preventDefault();
        movePreviousBill(e.key === 'PageUp' ? -1 : 1);
        return;
      }
      // F3 or Alt+I: focus Item Code.
      if (e.key === 'F3' || (e.altKey && e.key.toLowerCase() === 'i')) {
        e.preventDefault();
        codeInputRef.current?.focus();
        codeInputRef.current?.select();
      }
      // F6: open the current-order receipt / settlement drawer.
      if (e.key === 'F6') {
        e.preventDefault();
        handleFocusPayment();
      }
      // Alt+Q: focus Quantity
      if (e.altKey && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        quantityInputRef.current?.focus();
        quantityInputRef.current?.select();
      }
      // F4 or Ctrl+Enter: send to kitchen
      if (e.key === 'F4' || ((e.ctrlKey || e.metaKey) && e.key === 'Enter')) {
        e.preventDefault();
        if (lines.length > 0 && !busy) {
          void handleSendToKitchen();
        }
      }
      // F8: Save bill and send to printer immediately
      if (e.key === 'F8') {
        e.preventDefault();
        if (lines.length > 0 && !busy && !pendingBill) {
          setShowPaymentCollector(false);
          setShowReceiptDrawer(false);
          void handleSaveAndPrintBill();
        }
      }
      // F9 or Alt+N: new order tab
      if (e.key === 'F9' || (e.altKey && e.key.toLowerCase() === 'n')) {
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
  }, [lines.length, busy, pendingBill, activeTabId, tabs, tableName, cafeSettings, showPaymentCollector, showPreviousBillsDrawer, selectedPreviousBillId, gstApplied, activeTab.chair, activeTab.payment, total, orderMode, data.pos, data.restaurant_tables]);

  return (
    <div
      className="ito-region flex flex-1 flex-col h-full min-h-0 bg-background text-foreground select-none print:block print:min-h-0 print:p-0 print:m-0"
      {...topology.regionProps('q12')}
    >
      <TopologyMarker id="q12" topology={topology} />
      {printNotice && (
          <div className={`mx-4 mt-3 rounded-lg border px-3 py-2 text-sm ${isWarningNotice(printNotice) ? 'border-amber-500/70 bg-amber-500/10 text-amber-800' : 'border-emerald-500/70 bg-emerald-500/10 text-emerald-700'}`}>
          {printNotice}
        </div>
      )}

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
          setShowPaymentCollector(false);
        }}
        onCreateTab={createTab}
        onCloseTab={closeTab}
        linesCount={lines.length}
        busy={busy}
        onSaveBill={handleSaveAndPrintBill}
        onSendToKitchen={handleSendToKitchen}
        showOrderTabs={Boolean(cafeSettings.showOrderTabs)}
        showKitchenButton={Boolean(cafeSettings.showKitchenButton)}
      />

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
          searchQuery={searchQuery}
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
          onFocusPayment={handleFocusPayment}
        />
      </div>

      <Pos1BillsDrawer
        open={showReceiptDrawer}
        onOpenChange={setShowReceiptDrawer}
        linesCount={lines.length}
        total={settlementTotal}
        payment={activeTab.payment}
        pendingBillNumber={pendingBill?.billNumber}
        showPaymentCollector={showPaymentCollector}
        onOpenPaymentCollector={handleFocusPayment}
        onClosePaymentCollector={handleClosePaymentCollector}
        onRecordPayment={handleRecordPayment}
        onClearPayment={handleClearPayment}
        onSkipPayment={handleSkipPayment}
      />

      <Pos1PreviousBillsDrawer
        open={showPreviousBillsDrawer}
        onOpenChange={setShowPreviousBillsDrawer}
        bills={data.pos}
        items={data.pos_items}
        selectedBillId={selectedPreviousBillId}
        onSelectBill={setSelectedPreviousBillId}
        onMoveBill={movePreviousBill}
      />

      {/* Section 4: Manual Entry Area (Bottom Fast Strip) */}
      <Pos1ManualEntrySection
        topology={topology}
        itemCode={bottomCode}
        itemName={bottomName}
        quantity={bottomQuantity}
        menuItems={menuItems}
        onChangeItemCode={handleItemCodeChange}
        onChangeQuantity={setBottomQuantity}
        onApplyItem={handleApplyItem}
        onAddToOrder={handleBottomAddOrder}
        codeInputRef={codeInputRef}
        quantityInputRef={quantityInputRef}
        lastBill={lastBill ? { billNo: lastBill.bill_no, total: lastBill.grand_total, paid: lastBill.status === 'paid' } : null}
      />

    </div>
  );
}

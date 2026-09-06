import { useEffect, useMemo, useRef, useState } from 'react';
import { Printer, X } from 'lucide-react';
import { Button } from '@codexsun/ui/components/ui/button';
import { TopologyMarker, type InterfaceTopologyController } from '@codexsun/devkit-ito';
import type { Snapshot } from './api';
import { getMergedMenu, getMergedTables, type CustomMenuItem, type TableMasterConfig } from './mastersStore';
import { ThermalBillReceipt } from './ThermalBillReceipt';
import { loadSettings, type CafeSettings } from './Settings';
import {
  Pos1HeaderSection,
  Pos1ProductSection,
  Pos1BillingSection,
  Pos1ManualEntrySection,
  type EntryLine,
  type OrderTab,
  type PaymentRecord,
} from './pos1-sections';

type Props = {
  data: Snapshot;
  busy: boolean;
  mutate: (path: string, body: unknown) => Promise<unknown | false>;
  topology: InterfaceTopologyController;
};

export function formatChair(table: string, chair: number | string) {
  const match = table.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    return `${num}.${chair}`;
  }
  return `P.${chair}`;
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

export function Pos1({ data, busy, mutate, topology }: Props) {
  const [cafeSettings, setCafeSettings] = useState<CafeSettings>(() => loadSettings());
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const tableInputRef = useRef<HTMLInputElement>(null);
  const chairInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const rateInputRef = useRef<HTMLInputElement>(null);
  const collectorRef = useRef<HTMLDivElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const nextTabNum = useRef(2);

  // Tabs state
  const [tabs, setTabs] = useState<OrderTab[]>(() => {
    const defaultTable = loadSettings().defaultServiceType === 'Takeaway' ? 'Parcel' : 'T01';
    return [
      {
        id: 'tab-1',
        name: 'Order 1',
        tableName: defaultTable,
        chair: '1',
        lines: [
          {
            key: 'init-1',
            menuId: 2,
            code: 'ITM-002',
            name: 'Cappuccino',
            quantity: 1,
            price: 14000,
            chair: 4,
          },
          {
            key: 'init-2',
            menuId: 2,
            code: 'ITM-002',
            name: 'Cappuccino',
            quantity: 1,
            price: 14000,
            chair: 4,
          },
          {
            key: 'init-3',
            menuId: 4,
            code: 'ITM-004',
            name: 'Masala chai',
            quantity: 1,
            price: 6000,
            chair: 4,
          },
        ],
        gstApplied: false,
      },
    ];
  });
  const [activeTabId, setActiveTabId] = useState('tab-1');

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0]!;
  const lines = activeTab.lines;
  const tableName = activeTab.tableName;
  const chair = activeTab.chair ?? '1';
  const gstApplied = activeTab.gstApplied ?? false;

  // Catalog and master data
  const [menuItems, setMenuItems] = useState<CustomMenuItem[]>(() => getMergedMenu(data.menu));
  const [tableConfigs, setTableConfigs] = useState<TableMasterConfig[]>(() =>
    getMergedTables(data.restaurant_tables)
  );

  // Section 1: Search and Category Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Items');
  const [showMoreCategories, setShowMoreCategories] = useState(false);
  const [showPaymentCollector, setShowPaymentCollector] = useState(false);

  // Section 4: Manual entry state (synchronized with selected product card)
  const [selectedItem, setSelectedItem] = useState<CustomMenuItem | null>(() => {
    const first =
      getMergedMenu(data.menu).find((m) => m.name.toLowerCase() === 'cappuccino') ??
      getMergedMenu(data.menu)[0] ??
      null;
    return first;
  });
  const [bottomQuantity, setBottomQuantity] = useState<string>('1');
  const [bottomCode, setBottomCode] = useState<string>(() => selectedItem?.code ?? 'ITM-001');
  const [bottomName, setBottomName] = useState<string>(() => selectedItem?.name ?? 'Cappuccino');
  const [bottomRate, setBottomRate] = useState<string>(() =>
    selectedItem ? formatRate(selectedItem.price) : '140.00'
  );

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
    function applySelectedTable(tableNo: string, chairCount: number) {
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
          applySelectedTable(parsed.tableNo, parsed.chairCount || 4);
        }
      }
    } catch {
      // Storage unavailable
    }

    const handleTableSelected = (e: Event) => {
      const detail = (e as CustomEvent<{ tableNo: string; chairCount: number }>).detail;
      if (detail?.tableNo) {
        applySelectedTable(detail.tableNo, detail.chairCount || 4);
      }
    };

    window.addEventListener('q-cafe-table-selected', handleTableSelected);
    return () => window.removeEventListener('q-cafe-table-selected', handleTableSelected);
  }, [activeTabId]);

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
      codeInputRef.current?.focus();
      codeInputRef.current?.select();
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

  // Filtered categories
  const standardCategories = ['All Items', 'Hot Coffee', 'Cold Drinks', 'Snacks', 'Dessert'];
  const allAvailableCategories = useMemo(() => {
    const set = new Set<string>();
    menuItems.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set);
  }, [menuItems]);

  const moreCategories = useMemo(() => {
    return allAvailableCategories.filter((c) => !standardCategories.includes(c));
  }, [allAvailableCategories]);

  // Filtered product items
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return menuItems.filter((item) => {
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);

      const matchesCategory =
        selectedCategory === 'All Items' ||
        item.category.toLowerCase() === selectedCategory.toLowerCase() ||
        (selectedCategory === 'Hot Coffee' &&
          (item.category === 'Beverages' || item.category === 'Hot Coffee')) ||
        (selectedCategory === 'Dessert' && item.category === 'Bakery');

      return matchesSearch && matchesCategory;
    });
  }, [menuItems, searchQuery, selectedCategory]);

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
      lines: tab.lines
        .map((l) => (l.key === lineKey ? { ...l, quantity: l.quantity - 1 } : l))
        .filter((l) => l.quantity > 0),
    }));
  }

  function handleRemoveLine(lineKey: string) {
    updateActiveTab((tab) => ({
      lines: tab.lines.filter((l) => l.key !== lineKey),
    }));
  }

  // Section 2: Card selection & Add-to-cart
  function handleSelectAndAddCard(item: CustomMenuItem) {
    handleApplyItem(item);

    // Add to cart directly
    const targetChair = parseInt(chair, 10) || 1;
    updateActiveTab((tab) => {
      const existingIndex = tab.lines.findIndex(
        (l) => l.code.toUpperCase() === item.code.toUpperCase() && (l.chair ?? 1) === targetChair
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
    const matchedItem = menuItems.find(
      (m) =>
        (cleanCode && m.code.toLowerCase() === cleanCode.toLowerCase()) ||
        (cleanName && m.name.toLowerCase() === cleanName.toLowerCase())
    );
    const finalPrice = prc > 0 ? prc : (matchedItem?.price ?? 10000);
    const finalCode = cleanCode || matchedItem?.code || 'ITM-000';
    const finalName = cleanName || matchedItem?.name || 'Custom Item';

    const targetChair = parseInt(chair, 10) || 1;
    const existingIndex = lines.findIndex(
      (l) => l.code.toUpperCase() === finalCode.toUpperCase() && (l.chair ?? 1) === targetChair
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

    // Advance chair if multi-chair table
    const currentChair = Number(chair) || 1;
    const maxChairs = tableChairCount || 4;
    const nextChair = currentChair >= maxChairs ? 1 : currentChair + 1;
    updateActiveTab({ chair: String(nextChair) });

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
    const matched = menuItems.find((m) => m.code.toLowerCase() === val.trim().toLowerCase());
    if (matched) {
      setSelectedItem(matched);
      setBottomName(matched.name);
      setBottomRate(formatRate(matched.price));
    }
  }

  function handleItemNameChange(val: string) {
    setBottomName(val);
    const matched = menuItems.find((m) => m.name.toLowerCase() === val.trim().toLowerCase());
    if (matched) {
      setSelectedItem(matched);
      setBottomCode(matched.code);
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
      setShowPaymentCollector(false);
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
          gstApplied: false,
        });
      }
    }
  }

  // Section 5: Payment handling
  function handleRecordPayment(pay: PaymentRecord) {
    updateActiveTab({ payment: pay });
    setShowPaymentCollector(false);
  }

  function handleClearPayment() {
    updateActiveTab({ payment: null });
    setShowPaymentCollector(true);
  }

  function handleTogglePaymentCollector() {
    if (!lines.length) return;
    setShowPaymentCollector((prev) => !prev);
  }

  function handleClosePaymentCollector() {
    setShowPaymentCollector(false);
  }

  function handleFocusPayment() {
    if (!lines.length) return;
    setShowPaymentCollector(true);
    setTimeout(() => {
      const firstInput = collectorRef.current?.querySelector('input, select, button') as HTMLElement | null;
      firstInput?.focus();
    }, 60);
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
    const currentGuests = Math.min(Math.max(parseInt(activeTab.chair, 10) || 1, 1), Math.max(maxChairs, 1));

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

    // 3. Print thermal receipt
    window.print();

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
        lines: [],
        gstApplied: false,
        payment: null,
      });
    }
    setShowPaymentCollector(false);
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
        lines: [],
        gstApplied: false,
        payment: null,
      });
    }
    setShowPaymentCollector(false);
    requestAnimationFrame(() => {
      codeInputRef.current?.focus();
      codeInputRef.current?.select();
    });
  }

  // Auto-focus floating next order button when order is paid
  useEffect(() => {
    if (activeTab.payment && !showPaymentCollector) {
      requestAnimationFrame(() => {
        nextButtonRef.current?.focus();
      });
    }
  }, [activeTab.payment, showPaymentCollector]);

  // Global Keyboard Shortcuts (F2: search, F3: table, F4: kitchen, F5: settle, F6: item code, F7: preview, F8: confirm & print, F9: new order)
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Enter on paid order -> Next Order / Confirm
      if (e.key === 'Enter' && activeTab.payment && !showPaymentCollector) {
        const activeEl = document.activeElement;
        const isEditingOtherInput =
          activeEl === searchInputRef.current ||
          activeEl === nameInputRef.current ||
          activeEl === codeInputRef.current ||
          activeEl === tableInputRef.current ||
          activeEl === chairInputRef.current ||
          activeEl === quantityInputRef.current ||
          activeEl === rateInputRef.current;

        if (!isEditingOtherInput) {
          e.preventDefault();
          handleNextOrder();
          return;
        }
      }
      // Escape: close payment sheet if open
      if (e.key === 'Escape' && showPaymentCollector) {
        e.preventDefault();
        setShowPaymentCollector(false);
        return;
      }
      // F2: focus search
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      // F3 or Alt+T: focus Table
      if (e.key === 'F3' || (e.altKey && e.key.toLowerCase() === 't')) {
        e.preventDefault();
        tableInputRef.current?.focus();
        tableInputRef.current?.select();
      }
      // F5: toggle payment collector / settle
      if (e.key === 'F5') {
        e.preventDefault();
        if (lines.length > 0) {
          setShowPaymentCollector((prev) => !prev);
        }
      }
      // F6 or Alt+I: focus Item Code
      if (e.key === 'F6' || (e.altKey && e.key.toLowerCase() === 'i')) {
        e.preventDefault();
        codeInputRef.current?.focus();
        codeInputRef.current?.select();
      }
      // Shift+F6 or Alt+M: focus Item Name
      if ((e.shiftKey && e.key === 'F6') || (e.altKey && e.key.toLowerCase() === 'm')) {
        e.preventDefault();
        nameInputRef.current?.focus();
        nameInputRef.current?.select();
      }
      // Shift+F3 or Alt+C: focus Chair/Guests
      if ((e.shiftKey && e.key === 'F3') || (e.altKey && e.key.toLowerCase() === 'c')) {
        e.preventDefault();
        chairInputRef.current?.focus();
        chairInputRef.current?.select();
      }
      // Alt+Q: focus Quantity
      if (e.altKey && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        quantityInputRef.current?.focus();
        quantityInputRef.current?.select();
      }
      // Alt+P: focus Price
      if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        rateInputRef.current?.focus();
        rateInputRef.current?.select();
      }
      // F4 or Ctrl+Enter: send to kitchen
      if (e.key === 'F4' || ((e.ctrlKey || e.metaKey) && e.key === 'Enter')) {
        e.preventDefault();
        if (lines.length > 0 && !busy) {
          void handleSendToKitchen();
        }
      }
      // F7: preview slip
      if (e.key === 'F7') {
        e.preventDefault();
        if (lines.length > 0) {
          setShowReceiptPreview((v) => !v);
        }
      }
      // F8: confirm & print bill
      if (e.key === 'F8') {
        e.preventDefault();
        if (lines.length > 0 && !busy) {
          void handleConfirmOrder();
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
  }, [lines.length, busy, activeTabId, tabs, tableName, cafeSettings, showPaymentCollector, activeTab.payment, gstApplied, activeTab.chair, data.restaurant_tables]);

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
          setShowPaymentCollector(false);
        }}
        onCreateTab={createTab}
        onCloseTab={closeTab}
        linesCount={lines.length}
        busy={busy}
        onOpenReceiptPreview={() => setShowReceiptPreview(true)}
        onPrintBill={handleConfirmOrder}
        onSendToKitchen={handleSendToKitchen}
        payment={activeTab.payment}
        onFocusPayment={handleFocusPayment}
        showPaymentCollector={showPaymentCollector}
        onTogglePaymentCollector={handleTogglePaymentCollector}
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
          standardCategories={standardCategories}
          moreCategories={moreCategories}
          showMoreCategories={showMoreCategories}
          onToggleShowMoreCategories={setShowMoreCategories}
        />

        {/* Right Column: Billing Cart Panel (below header) */}
        <Pos1BillingSection
          topology={topology}
          activeTab={activeTab}
          tableName={tableName}
          lines={lines}
          subtotal={subtotal}
          totalQuantity={totalQuantity}
          gstApplied={gstApplied}
          gstAmount={gstAmount}
          total={total}
          cafeSettings={cafeSettings}
          onToggleGst={() => updateActiveTab((tab) => ({ gstApplied: !tab.gstApplied }))}
          onIncrementLine={handleIncrementLine}
          onDecrementLine={handleDecrementLine}
          onRemoveLine={handleRemoveLine}
          formatChair={formatChair}
          onRecordPayment={handleRecordPayment}
          onClearPayment={handleClearPayment}
          collectorRef={collectorRef}
          showPaymentCollector={showPaymentCollector}
          onTogglePaymentCollector={handleTogglePaymentCollector}
          onClosePaymentCollector={handleClosePaymentCollector}
          onNextOrder={handleNextOrder}
          nextButtonRef={nextButtonRef}
        />
      </div>

      {/* Section 4: Manual Entry Area (Bottom Fast Strip) */}
      <Pos1ManualEntrySection
        topology={topology}
        tableName={tableName}
        chair={chair}
        itemCode={bottomCode}
        itemName={bottomName}
        quantity={bottomQuantity}
        rate={bottomRate}
        tableConfigs={tableConfigs}
        menuItems={menuItems}
        tableChairCount={tableChairCount}
        onSelectTable={(tableNo) => updateActiveTab({ tableName: tableNo })}
        onSelectChair={(seat) => updateActiveTab({ chair: seat })}
        onChangeItemCode={handleItemCodeChange}
        onChangeItemName={handleItemNameChange}
        onChangeQuantity={setBottomQuantity}
        onChangeRate={setBottomRate}
        onApplyItem={handleApplyItem}
        onAddToOrder={handleBottomAddOrder}
        formatChair={formatChair}
        tableInputRef={tableInputRef}
        chairInputRef={chairInputRef}
        codeInputRef={codeInputRef}
        nameInputRef={nameInputRef}
        quantityInputRef={quantityInputRef}
        rateInputRef={rateInputRef}
      />

      {/* On-screen Preview Slip Dialog */}
      {showReceiptPreview && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-xs print:hidden"
          onClick={() => setShowReceiptPreview(false)}
        >
          <div
            className="relative flex max-h-[90vh] flex-col rounded-2xl border border-border bg-white text-black shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
              <span className="text-xs font-semibold text-foreground">
                3-Inch Hotel Thermal Receipt Slip
              </span>
              <button
                type="button"
                onClick={() => setShowReceiptPreview(false)}
                className="grid size-7 cursor-pointer place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 scrollbar-slim bg-[#fafafa]">
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
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border bg-white p-3">
              <Button variant="outline" size="sm" onClick={() => setShowReceiptPreview(false)}>
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  window.print();
                }}
              >
                <Printer size={14} className="mr-1.5" />
                Print Now
              </Button>
            </div>
          </div>
        </div>
      )}

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
        className="hidden print:block thermal-receipt"
      />
    </div>
  );
}

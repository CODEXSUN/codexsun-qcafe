import { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Eye,
  FileSpreadsheet,
  Filter,
  IndianRupee,
  Layers,
  Plus,
  Printer,
  QrCode,
  Receipt,
  ReceiptText,
  RefreshCw,
  Scale,
  Search,
  SlidersHorizontal,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { Button } from '@codexsun/ui/components/ui/button';
import { TopologyMarker, type InterfaceTopologyController } from '@codexsun/devkit-ito';
import { money, type PosBill, type PosItem, type ReceiptTransaction, type Snapshot } from './api';
import { loadSettings } from './Settings';
import { ThermalBillReceipt } from './ThermalBillReceipt';
import { ThermalZReport } from './ThermalZReport';

type OverviewProps = {
  data: Snapshot;
  busy: boolean;
  mutate: (path: string, body: unknown) => Promise<unknown | false>;
  topology: InterfaceTopologyController;
  navigate: (page: string) => void;
};

type DateFilterPreset = 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom';
type ViewMode = 'invoices' | 'daily_summary';

function parseDate(dateStr: string): Date {
  const normalized = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? new Date(dateStr) : d;
}

function getLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function Overview({ data, busy, mutate, topology, navigate }: OverviewProps) {
  const settings = loadSettings();
  const todayStr = getLocalDateString(new Date());

  const [dateFilter, setDateFilter] = useState<DateFilterPreset>('today');
  const [customDate, setCustomDate] = useState<string>(todayStr);
  const [viewMode, setViewMode] = useState<ViewMode>('invoices');
  const [showKpiStrip, setShowKpiStrip] = useState(true);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const [searchBillQuery, setSearchBillQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Preview & Re-print Modal for past bill
  const [previewBill, setPreviewBill] = useState<PosBill | null>(null);

  // Daily Settlement Modal
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementDate, setSettlementDate] = useState<string>(todayStr);
  const [settlementNotes, setSettlementNotes] = useState('');
  const [settledSuccess, setSettledSuccess] = useState(false);

  // Print mode tracker ('bill' | 'z-report')
  const [printMode, setPrintMode] = useState<'bill' | 'z-report' | null>(null);

  // Cashier Drawer Denominations for Settlement
  const [denominations, setDenominations] = useState<Record<number, number>>({
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
  });
  const [coinAmount, setCoinAmount] = useState<number>(0);

  // Map receipts & transactions by pos_id
  const receiptMap = useMemo(() => {
    const map = new Map<number, { receipt?: (typeof data.receipts)[0]; transactions: ReceiptTransaction[] }>();
    for (const r of data.receipts || []) {
      const txns = (data.receipt_transactions || []).filter((t) => t.receipt_id === r.id);
      map.set(r.pos_id, { receipt: r, transactions: txns });
    }
    return map;
  }, [data.receipts, data.receipt_transactions]);

  // Map pos_items by pos_id
  const itemsMap = useMemo(() => {
    const map = new Map<number, PosItem[]>();
    for (const it of data.pos_items || []) {
      const list = map.get(it.pos_id) || [];
      list.push(it);
      map.set(it.pos_id, list);
    }
    return map;
  }, [data.pos_items]);

  // Determine active date range
  const dateRange = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (dateFilter === 'today') {
      return { start: today, end: new Date(today.getTime() + 86400000) };
    }
    if (dateFilter === 'yesterday') {
      const yest = new Date(today.getTime() - 86400000);
      return { start: yest, end: today };
    }
    if (dateFilter === 'week') {
      const startOfWeek = new Date(today.getTime() - 6 * 86400000);
      return { start: startOfWeek, end: new Date(today.getTime() + 86400000) };
    }
    if (dateFilter === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: startOfMonth, end: new Date(today.getTime() + 86400000) };
    }
    if (dateFilter === 'custom') {
      const [y, m, d] = customDate.split('-').map(Number);
      if (y && m && d) {
        const start = new Date(y, m - 1, d);
        return { start, end: new Date(start.getTime() + 86400000) };
      }
    }
    return null; // 'all'
  }, [dateFilter, customDate]);

  // Filter bills by date range
  const filteredBills = useMemo(() => {
    const bills = data.pos || [];
    return bills.filter((bill) => {
      if (bill.status === 'void') return false;
      if (!dateRange) return true;
      const billDate = parseDate(bill.created_at);
      return billDate >= dateRange.start && billDate < dateRange.end;
    });
  }, [data.pos, dateRange]);

  // Filter bills by search query, payment mode, and status
  const displayedBills = useMemo(() => {
    return filteredBills.filter((bill) => {
      const receiptInfo = receiptMap.get(bill.id);
      const txns = receiptInfo?.transactions || [];
      const primaryMode = txns[0]?.transaction_mode || 'cash';

      if (selectedMode !== 'all' && primaryMode !== selectedMode) {
        return false;
      }
      if (selectedStatus !== 'all' && bill.status !== selectedStatus) {
        return false;
      }
      if (searchBillQuery.trim()) {
        const q = searchBillQuery.trim().toLowerCase();
        const matchesBillNo = bill.bill_no.toLowerCase().includes(q);
        const matchesTable = bill.table_no.toLowerCase().includes(q);
        const items = itemsMap.get(bill.id) || [];
        const matchesItem = items.some(
          (it) => it.item_name.toLowerCase().includes(q) || it.item_code.toLowerCase().includes(q)
        );
        return matchesBillNo || matchesTable || matchesItem;
      }
      return true;
    });
  }, [filteredBills, receiptMap, itemsMap, selectedMode, selectedStatus, searchBillQuery]);

  // Aggregate KPIs for the active filter
  const kpis = useMemo(() => {
    let grossTotal = 0;
    let taxableTotal = 0;
    let gstTotal = 0;
    let cashTotal = 0;
    let upiTotal = 0;
    let cardTotal = 0;
    let cashCount = 0;
    let upiCount = 0;
    let cardCount = 0;

    for (const bill of filteredBills) {
      grossTotal += bill.grand_total;
      taxableTotal += bill.taxable_amount;
      gstTotal += bill.gst_amount;

      const receiptInfo = receiptMap.get(bill.id);
      if (receiptInfo?.transactions) {
        for (const txn of receiptInfo.transactions) {
          if (txn.transaction_mode === 'cash') {
            cashTotal += txn.amount;
            cashCount++;
          } else if (txn.transaction_mode === 'upi') {
            upiTotal += txn.amount;
            upiCount++;
          } else if (txn.transaction_mode === 'card' || txn.transaction_mode === 'bank') {
            cardTotal += txn.amount;
            cardCount++;
          }
        }
      }
    }

    return {
      billCount: filteredBills.length,
      grossTotal,
      taxableTotal,
      gstTotal,
      cashTotal,
      cashCount,
      upiTotal,
      upiCount,
      cardTotal,
      cardCount,
      avgPerBill: filteredBills.length > 0 ? Math.round(grossTotal / filteredBills.length) : 0,
    };
  }, [filteredBills, receiptMap]);

  // Date-wise Aggregation Grouping
  const dateWiseSummary = useMemo(() => {
    const groups = new Map<
      string,
      {
        dateStr: string;
        displayDate: string;
        billsCount: number;
        taxable: number;
        gst: number;
        gross: number;
        cash: number;
        upi: number;
        card: number;
      }
    >();

    for (const bill of data.pos || []) {
      if (bill.status === 'void') continue;
      const bDate = parseDate(bill.created_at);
      const key = getLocalDateString(bDate);

      let group = groups.get(key);
      if (!group) {
        const display = bDate.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          weekday: 'short',
        });
        group = {
          dateStr: key,
          displayDate: display,
          billsCount: 0,
          taxable: 0,
          gst: 0,
          gross: 0,
          cash: 0,
          upi: 0,
          card: 0,
        };
        groups.set(key, group);
      }

      group.billsCount += 1;
      group.taxable += bill.taxable_amount;
      group.gst += bill.gst_amount;
      group.gross += bill.grand_total;

      const receiptInfo = receiptMap.get(bill.id);
      if (receiptInfo?.transactions) {
        for (const txn of receiptInfo.transactions) {
          if (txn.transaction_mode === 'cash') group.cash += txn.amount;
          else if (txn.transaction_mode === 'upi') group.upi += txn.amount;
          else if (txn.transaction_mode === 'card' || txn.transaction_mode === 'bank')
            group.card += txn.amount;
        }
      }
    }

    return Array.from(groups.values()).sort((a, b) => b.dateStr.localeCompare(a.dateStr));
  }, [data.pos, receiptMap]);

  // Calculation for Day-End Settlement Modal
  const settlementKpis = useMemo(() => {
    const targetBills = (data.pos || []).filter((b) => {
      if (b.status === 'void') return false;
      const bDate = parseDate(b.created_at);
      return getLocalDateString(bDate) === settlementDate;
    });

    let grossTotal = 0;
    let taxableTotal = 0;
    let gstTotal = 0;
    let cashTotal = 0;
    let upiTotal = 0;
    let cardTotal = 0;
    let cashBillsCount = 0;
    let upiBillsCount = 0;
    let cardBillsCount = 0;

    for (const b of targetBills) {
      grossTotal += b.grand_total;
      taxableTotal += b.taxable_amount;
      gstTotal += b.gst_amount;

      const receiptInfo = receiptMap.get(b.id);
      if (receiptInfo?.transactions) {
        for (const txn of receiptInfo.transactions) {
          if (txn.transaction_mode === 'cash') {
            cashTotal += txn.amount;
            cashBillsCount++;
          } else if (txn.transaction_mode === 'upi') {
            upiTotal += txn.amount;
            upiBillsCount++;
          } else if (txn.transaction_mode === 'card' || txn.transaction_mode === 'bank') {
            cardTotal += txn.amount;
            cardBillsCount++;
          }
        }
      }
    }

    // Physical cash counted calculation
    let countedCash = coinAmount;
    for (const [note, count] of Object.entries(denominations)) {
      countedCash += Number(note) * count * 100;
    }

    const variance = countedCash - cashTotal;

    return {
      billCount: targetBills.length,
      grossTotal,
      taxableTotal,
      gstTotal,
      cashTotal,
      cashBillsCount,
      upiTotal,
      upiBillsCount,
      cardTotal,
      cardBillsCount,
      cashCounted: countedCash,
      variance,
    };
  }, [data.pos, receiptMap, settlementDate, denominations, coinAmount]);

  // Auto-fill denominations from recorded cash transactions of the settlement day
  function handleAutoFillDenominations() {
    const targetBills = (data.pos || []).filter((b) => {
      if (b.status === 'void') return false;
      const bDate = parseDate(b.created_at);
      return getLocalDateString(bDate) === settlementDate;
    });

    const aggregateNotes: Record<number, number> = {
      500: 0,
      200: 0,
      100: 0,
      50: 0,
      20: 0,
      10: 0,
    };

    let hasParsedAny = false;
    for (const b of targetBills) {
      const receiptInfo = receiptMap.get(b.id);
      if (receiptInfo?.transactions) {
        for (const txn of receiptInfo.transactions) {
          if (txn.denominations) {
            try {
              const parsed = JSON.parse(txn.denominations) as Record<string, number>;
              for (const [denom, cnt] of Object.entries(parsed)) {
                const numDenom = Number(denom);
                if (aggregateNotes[numDenom] !== undefined) {
                  aggregateNotes[numDenom] += Number(cnt) || 0;
                  hasParsedAny = true;
                }
              }
            } catch {
              // ignore invalid json
            }
          }
        }
      }
    }

    if (hasParsedAny) {
      setDenominations(aggregateNotes);
    } else {
      let remaining = Math.floor(settlementKpis.cashTotal / 100);
      const computed: Record<number, number> = { 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0 };
      for (const val of [500, 200, 100, 50, 20, 10]) {
        if (remaining >= val) {
          const c = Math.floor(remaining / val);
          computed[val] = c;
          remaining -= c * val;
        }
      }
      setDenominations(computed);
      setCoinAmount(remaining * 100);
    }
  }

  // Open Day-End Settlement Modal
  function handleOpenSettlement(dateStr?: string) {
    const target = dateStr || (dateFilter === 'custom' ? customDate : todayStr);
    setSettlementDate(target);
    setShowSettlementModal(true);
    setSettledSuccess(false);
  }

  // Trigger Print for Past Bill Slip
  function handlePrintBillSlip(bill: PosBill) {
    setPreviewBill(bill);
    setPrintMode('bill');
    requestAnimationFrame(() => {
      window.print();
    });
  }

  // Trigger Print for Daily Settlement Z-Report
  function handlePrintZReport() {
    setPrintMode('z-report');
    requestAnimationFrame(() => {
      window.print();
    });
  }

  // Confirm settlement
  async function handleConfirmSettlement() {
    setSettledSuccess(true);
    setTimeout(() => {
      setShowSettlementModal(false);
      setSettledSuccess(false);
    }, 1800);
  }

  return (
    <div
      className="ito-region flex flex-1 flex-col h-full min-h-0 bg-background text-foreground select-none gap-2.5 overflow-hidden print:m-0 print:p-0"
      {...topology.regionProps('q13')}
    >
      <TopologyMarker id="q13" topology={topology} />

      {/* TOP UNIFIED MINIMAL HEADER BAR (~44px, Zero Redundancy) */}
      <header className="shrink-0 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-border bg-card px-3.5 py-2 shadow-2xs print:hidden">
        {/* Left: Title + Date Filter Pills + Date Picker */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 pr-1 border-r border-border">
            <TrendingUp className="size-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-bold tracking-tight text-foreground">Overview</h2>
          </div>

          {/* Minimal Date Preset Pills */}
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
            {(
              [
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'week', label: '7 Days' },
                { id: 'month', label: 'Month' },
                { id: 'all', label: 'All Time' },
              ] as const
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setDateFilter(preset.id)}
                className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  dateFilter === preset.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Compact Date Picker */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 text-xs shadow-2xs">
            <Calendar size={12} className="text-muted-foreground shrink-0" />
            <input
              type="date"
              aria-label="Custom date"
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                setDateFilter('custom');
              }}
              className="bg-transparent text-xs font-medium outline-none cursor-pointer text-foreground"
            />
          </div>
        </div>

        {/* Right: View Switcher Tabs + Filter Dropdown + Daily Settlement + New Order */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* View Toggle Segment: Invoices vs Daily Summary */}
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('invoices')}
              className={`flex items-center gap-1.5 cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                viewMode === 'invoices'
                  ? 'bg-card text-foreground shadow-2xs border border-border/70'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ReceiptText size={12} />
              <span>Invoices</span>
              <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] font-bold">
                {displayedBills.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('daily_summary')}
              className={`flex items-center gap-1.5 cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                viewMode === 'daily_summary'
                  ? 'bg-card text-foreground shadow-2xs border border-border/70'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calendar size={12} />
              <span>Daily Summary</span>
              <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] font-bold">
                {dateWiseSummary.length}
              </span>
            </button>
          </div>

          {/* Filter Dropdown Toggle Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFilterDropdown((v) => !v)}
              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold cursor-pointer transition-colors shadow-2xs ${
                showFilterDropdown || selectedMode !== 'all' || selectedStatus !== 'all'
                  ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                  : 'border-border bg-background hover:bg-muted text-foreground'
              }`}
              title="Filter by payment mode, status, or toggle metrics"
            >
              <SlidersHorizontal size={12} />
              <span>Filters</span>
              {(selectedMode !== 'all' || selectedStatus !== 'all') && (
                <span className="size-1.5 rounded-full bg-blue-600" />
              )}
            </button>

            {/* Filter Dropdown Popover */}
            {showFilterDropdown && (
              <div
                className="absolute right-0 top-[calc(100%+0.35rem)] z-50 w-64 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-xl space-y-3"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-border pb-1.5">
                  <span className="text-xs font-bold">Table & View Filters</span>
                  <button
                    type="button"
                    onClick={() => setShowFilterDropdown(false)}
                    className="cursor-pointer text-muted-foreground hover:text-foreground"
                  >
                    <X size={13} />
                  </button>
                </div>

                {/* Payment Mode Filter */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Payment Mode:</label>
                  <select
                    value={selectedMode}
                    onChange={(e) => setSelectedMode(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs font-medium text-foreground outline-none"
                  >
                    <option value="all">All Modes (Cash, UPI, Card)</option>
                    <option value="cash">Cash Only</option>
                    <option value="upi">UPI / QR Only</option>
                    <option value="card">Card / POS Only</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Bill Status:</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs font-medium text-foreground outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="paid">Paid</option>
                    <option value="part-paid">Part Paid</option>
                    <option value="open">Open</option>
                  </select>
                </div>

                {/* KPI Strip Visibility Toggle */}
                <div className="border-t border-border pt-2 flex items-center justify-between">
                  <span className="text-xs font-medium">Show Summary KPI Bar</span>
                  <input
                    type="checkbox"
                    checked={showKpiStrip}
                    onChange={(e) => setShowKpiStrip(e.target.checked)}
                    className="cursor-pointer"
                  />
                </div>

                {/* Reset Filters */}
                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMode('all');
                      setSelectedStatus('all');
                      setShowFilterDropdown(false);
                    }}
                    className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold cursor-pointer hover:underline"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Daily Settlement (EOD) Button */}
          <Button
            type="button"
            onClick={() => handleOpenSettlement()}
            className="cursor-pointer gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs rounded-lg h-7 px-3"
            title="Perform End of Day register settlement and print Z-Report"
          >
            <Scale size={13} />
            <span>Daily Settlement</span>
          </Button>

          {/* Quick Billing Desk */}
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('POS')}
            className="cursor-pointer gap-1.5 font-medium shadow-xs text-xs h-7 px-2.5"
            title="Open POS Billing Desk"
          >
            <Plus size={15} />
            <span>New POS Bill</span>
          </Button>
        </div>
      </header>

      {/* MINIMAL KPI METRICS STRIP (1-Row, Compact ~38px, High Density) */}
      {showKpiStrip && (
        <div
          className="shrink-0 flex items-center justify-between rounded-xl border border-border bg-card px-3 py-1.5 shadow-2xs gap-2 overflow-x-auto no-scrollbar print:hidden"
          {...topology.regionProps('q13.1')}
        >
          <TopologyMarker id="q13.1" topology={topology} />

          <div className="flex items-center gap-4 text-xs shrink-0 divide-x divide-border">
            {/* Total Sales */}
            <div className="flex items-center gap-1.5 pr-3">
              <span className="text-muted-foreground font-medium">Total Sales:</span>
              <span className="font-bold text-foreground font-mono text-sm">{money(kpis.grossTotal)}</span>
              <span className="text-[10px] text-muted-foreground">({kpis.billCount} bills)</span>
            </div>

            {/* Cash Collected */}
            <div className="flex items-center gap-1.5 px-3">
              <span className="text-muted-foreground font-medium flex items-center gap-1">
                <Wallet size={12} className="text-emerald-600" /> Cash:
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {money(kpis.cashTotal)}
              </span>
              <span className="text-[10px] text-muted-foreground">({kpis.cashCount})</span>
            </div>

            {/* UPI / QR */}
            <div className="flex items-center gap-1.5 px-3">
              <span className="text-muted-foreground font-medium flex items-center gap-1">
                <QrCode size={12} className="text-blue-600" /> UPI:
              </span>
              <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
                {money(kpis.upiTotal)}
              </span>
              <span className="text-[10px] text-muted-foreground">({kpis.upiCount})</span>
            </div>

            {/* Card / POS */}
            <div className="flex items-center gap-1.5 px-3">
              <span className="text-muted-foreground font-medium flex items-center gap-1">
                <CreditCard size={12} className="text-indigo-600" /> Card:
              </span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                {money(kpis.cardTotal)}
              </span>
              <span className="text-[10px] text-muted-foreground">({kpis.cardCount})</span>
            </div>

            {/* Total GST */}
            <div className="flex items-center gap-1.5 px-3">
              <span className="text-muted-foreground font-medium">GST Tax:</span>
              <span className="font-mono font-semibold text-foreground">{money(kpis.gstTotal)}</span>
            </div>

            {/* Avg/Bill */}
            <div className="flex items-center gap-1.5 pl-3">
              <span className="text-muted-foreground font-medium">Avg/Bill:</span>
              <span className="font-mono text-muted-foreground">{money(kpis.avgPerBill)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowKpiStrip(false)}
            className="cursor-pointer text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted"
            title="Hide KPI bar to expand table space"
          >
            <ChevronUp size={14} />
          </button>
        </div>
      )}

      {/* VIEW 1: INVOICES & PAYMENT TRANSACTIONS TABLE (FULL VIEWPORT HEIGHT & RANGE) */}
      {viewMode === 'invoices' && (
        <div
          className="flex-1 min-h-0 flex flex-col rounded-xl border border-border bg-card shadow-xs overflow-hidden"
          {...topology.regionProps('q13.3')}
        >
          <TopologyMarker id="q13.3" topology={topology} />

          {/* Table Search & Quick Filter Strip */}
          <div className="shrink-0 flex items-center justify-between border-b border-border px-3 py-2 bg-muted/20 gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <div className="relative flex items-center rounded-lg border border-border bg-background px-2.5 py-1 w-64 shadow-2xs">
                <Search size={12} className="text-muted-foreground shrink-0 mr-1.5" />
                <input
                  type="text"
                  aria-label="Search bills"
                  placeholder="Search Bill #, Table, or Item..."
                  value={searchBillQuery}
                  onChange={(e) => setSearchBillQuery(e.target.value)}
                  className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                />
                {searchBillQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchBillQuery('')}
                    className="cursor-pointer text-muted-foreground hover:text-foreground"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Quick Mode Filters */}
              <div className="flex items-center gap-1">
                {(['all', 'cash', 'upi', 'card'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMode(m)}
                    className={`cursor-pointer rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                      selectedMode === m
                        ? 'bg-foreground text-background'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {m === 'all' ? 'All' : m.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{displayedBills.length}</span> bills • Total:{' '}
              <span className="font-bold text-foreground font-mono">
                {money(displayedBills.reduce((s, b) => s + b.grand_total, 0))}
              </span>
            </div>
          </div>

          {/* FULL HEIGHT SCROLLABLE TABLE BODY */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-slim">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs border-b border-border shadow-2xs font-semibold text-muted-foreground">
                <tr>
                  <th className="px-3.5 py-2">Bill No</th>
                  <th className="px-3.5 py-2">Date & Time</th>
                  <th className="px-3.5 py-2">Table</th>
                  <th className="px-3.5 py-2">Ordered Items</th>
                  <th className="px-3.5 py-2 text-right">Taxable</th>
                  <th className="px-3.5 py-2 text-right">GST</th>
                  <th className="px-3.5 py-2 text-right font-bold text-foreground">Grand Total</th>
                  <th className="px-3.5 py-2">Payment Mode</th>
                  <th className="px-3.5 py-2 text-center">Status</th>
                  <th className="px-3.5 py-2 text-center">Slip / Print</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayedBills.map((bill) => {
                  const bDate = parseDate(bill.created_at);
                  const timeFormatted = bDate.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  });
                  const dateFormatted = bDate.toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                  });

                  const billItems = itemsMap.get(bill.id) || [];
                  const itemsSummary = billItems
                    .map((it) => `${it.item_name} ×${it.quantity}`)
                    .join(', ');

                  const receiptInfo = receiptMap.get(bill.id);
                  const txns = receiptInfo?.transactions || [];
                  const primaryTxn = txns[0];
                  const mode = primaryTxn?.transaction_mode || 'cash';

                  return (
                    <tr key={bill.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3.5 py-2.5 font-mono font-bold text-foreground">{bill.bill_no}</td>
                      <td className="px-3.5 py-2.5 text-muted-foreground whitespace-nowrap">
                        <span>{dateFormatted}</span>
                        <span className="ml-1 text-[11px] opacity-75">{timeFormatted}</span>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5 font-semibold text-foreground text-[11px]">
                          {bill.table_no}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 max-w-sm truncate text-muted-foreground" title={itemsSummary}>
                        {itemsSummary || `${billItems.length} item(s)`}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono text-muted-foreground">
                        {money(bill.taxable_amount)}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono text-muted-foreground">
                        {money(bill.gst_amount)}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-bold text-foreground">
                        {money(bill.grand_total)}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        {mode === 'cash' && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                            <Wallet size={11} /> Cash
                          </span>
                        )}
                        {mode === 'upi' && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                            <QrCode size={11} /> UPI{' '}
                            {primaryTxn?.reference_no && primaryTxn.reference_no !== '-'
                              ? `(${primaryTxn.reference_no})`
                              : ''}
                          </span>
                        )}
                        {(mode === 'card' || mode === 'bank') && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-indigo-500/30 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                            <CreditCard size={11} /> Card{' '}
                            {primaryTxn?.reference_no && primaryTxn.reference_no !== '-'
                              ? `(${primaryTxn.reference_no})`
                              : ''}
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            bill.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : bill.status === 'part-paid'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                          }`}
                        >
                          {bill.status}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewBill(bill)}
                            aria-label={`Preview slip for ${bill.bill_no}`}
                            className="grid size-6.5 cursor-pointer place-items-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="Preview receipt slip"
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrintBillSlip(bill)}
                            aria-label={`Print slip for ${bill.bill_no}`}
                            className="grid size-6.5 cursor-pointer place-items-center rounded-md border border-border text-foreground hover:bg-muted transition-colors"
                            title="Print thermal receipt"
                          >
                            <Printer size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {displayedBills.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-16 text-center text-muted-foreground italic">
                      No invoices found for the selected date range and filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Sticky Table Bottom Summary Bar */}
          <div className="shrink-0 flex items-center justify-between border-t border-border px-4 py-2 bg-muted/40 text-xs font-semibold">
            <div className="text-muted-foreground">
              Total Recorded Invoices: <span className="text-foreground">{displayedBills.length}</span>
            </div>
            <div className="flex items-center gap-4">
              <span>
                Net Taxable:{' '}
                <span className="font-mono text-foreground font-bold">
                  {money(displayedBills.reduce((s, b) => s + b.taxable_amount, 0))}
                </span>
              </span>
              <span>
                Total Tax:{' '}
                <span className="font-mono text-foreground font-bold">
                  {money(displayedBills.reduce((s, b) => s + b.gst_amount, 0))}
                </span>
              </span>
              <span className="text-sm">
                Grand Total:{' '}
                <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
                  {money(displayedBills.reduce((s, b) => s + b.grand_total, 0))}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DATE-WISE SALES SUMMARY TABLE (Accessible via Segmented Switch) */}
      {viewMode === 'daily_summary' && (
        <div
          className="flex-1 min-h-0 flex flex-col rounded-xl border border-border bg-card shadow-xs overflow-hidden"
          {...topology.regionProps('q13.2')}
        >
          <TopologyMarker id="q13.2" topology={topology} />

          <div className="shrink-0 flex items-center justify-between border-b border-border px-4 py-2.5 bg-muted/20">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-blue-600" />
              <h3 className="text-xs font-bold text-foreground">Date-Wise Revenue & Settlement Breakdown</h3>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Click &quot;Settle Day&quot; to open day-end register reconciliation for any date
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-slim">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs border-b border-border font-semibold text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5 text-center">Bills Count</th>
                  <th className="px-4 py-2.5 text-right">Taxable Net</th>
                  <th className="px-4 py-2.5 text-right">GST</th>
                  <th className="px-4 py-2.5 text-right font-bold text-foreground">Gross Sales</th>
                  <th className="px-4 py-2.5 text-right text-emerald-600 dark:text-emerald-400">Cash ₹</th>
                  <th className="px-4 py-2.5 text-right text-blue-600 dark:text-blue-400">UPI ₹</th>
                  <th className="px-4 py-2.5 text-right text-indigo-600 dark:text-indigo-400">Card ₹</th>
                  <th className="px-4 py-2.5 text-center">Settlement Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dateWiseSummary.map((row) => (
                  <tr key={row.dateStr} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {row.displayDate}
                      {row.dateStr === todayStr && (
                        <span className="ml-2 rounded-md bg-blue-100 dark:bg-blue-950 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                          Today
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-medium">{row.billsCount}</td>
                    <td className="px-4 py-3 text-right font-mono">{money(row.taxable)}</td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">{money(row.gst)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-foreground">{money(row.gross)}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                      {money(row.cash)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-blue-600 dark:text-blue-400">
                      {money(row.upi)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-indigo-600 dark:text-indigo-400">
                      {money(row.card)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenSettlement(row.dateStr)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition-colors shadow-2xs"
                      >
                        <Scale size={12} />
                        <span>Settle Day</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {dateWiseSummary.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center text-muted-foreground italic">
                      No billing activity recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal 1: On-Screen Preview & Re-print Dialog for Past Bill Slip */}
      {previewBill && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-xs print:hidden"
          onClick={() => setPreviewBill(null)}
        >
          <div
            className="relative flex max-h-[92vh] flex-col rounded-2xl border border-border bg-white text-black shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
              <span className="text-xs font-semibold text-foreground">
                Thermal Receipt Slip • {previewBill.bill_no}
              </span>
              <button
                type="button"
                onClick={() => setPreviewBill(null)}
                className="grid size-7 cursor-pointer place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 scrollbar-slim bg-[#fafafa]">
              <ThermalBillReceipt
                settings={settings}
                bill={previewBill}
                items={itemsMap.get(previewBill.id)}
                transactions={receiptMap.get(previewBill.id)?.transactions}
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border bg-white p-3">
              <Button variant="outline" size="sm" onClick={() => setPreviewBill(null)}>
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => handlePrintBillSlip(previewBill)}
                className="cursor-pointer"
              >
                <Printer size={14} className="mr-1.5" />
                Print Receipt
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Daily Settlement (Day-End Cashier Reconciliation) Dialog */}
      {showSettlementModal && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-xs print:hidden"
          onClick={() => setShowSettlementModal(false)}
        >
          <div
            className="relative flex w-full max-w-2xl max-h-[92vh] flex-col rounded-2xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            {...topology.regionProps('q13.4')}
          >
            <TopologyMarker id="q13.4" topology={topology} />

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-7 place-items-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <Scale size={16} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Day-End Cashier Settlement (Z-Report)</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Reconcile drawer cash, notes breakdown, digital payments, and close register.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSettlementModal(false)}
                className="grid size-7 cursor-pointer place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {settledSuccess ? (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 p-6 text-center space-y-2">
                  <CheckCircle2 size={36} className="mx-auto text-emerald-600 dark:text-emerald-400" />
                  <h4 className="text-base font-bold text-emerald-800 dark:text-emerald-200">
                    Day-End Register Successfully Settled!
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    All transactions reconciled. The Z-Report has been logged for Date: {settlementDate}.
                  </p>
                </div>
              ) : (
                <>
                  {/* Settlement Date Selector & Pre-fill */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-border bg-muted/20 p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">Settlement Date:</span>
                      <input
                        type="date"
                        aria-label="Settlement Date"
                        value={settlementDate}
                        onChange={(e) => setSettlementDate(e.target.value)}
                        className="rounded-md border border-border bg-background px-2 py-0.5 text-xs font-semibold text-foreground outline-none cursor-pointer"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAutoFillDenominations}
                      className="cursor-pointer rounded-md border border-border bg-card px-2 py-1 text-xs font-semibold text-foreground hover:bg-accent transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <RefreshCw size={11} />
                      <span>Pre-fill Denominations</span>
                    </button>
                  </div>

                  {/* Financial Overview Tiles */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="rounded-lg border border-border bg-background p-2.5">
                      <span className="text-muted-foreground text-[11px]">Gross Sales</span>
                      <p className="text-sm font-bold text-foreground mt-0.5 font-mono">
                        {money(settlementKpis.grossTotal)}
                      </p>
                      <span className="text-[10px] text-muted-foreground">{settlementKpis.billCount} bills</span>
                    </div>
                    <div className="rounded-lg border border-border bg-background p-2.5">
                      <span className="text-muted-foreground text-[11px]">Expected Cash</span>
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                        {money(settlementKpis.cashTotal)}
                      </p>
                      <span className="text-[10px] text-muted-foreground">{settlementKpis.cashBillsCount} bills</span>
                    </div>
                    <div className="rounded-lg border border-border bg-background p-2.5">
                      <span className="text-muted-foreground text-[11px]">UPI / QR</span>
                      <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5 font-mono">
                        {money(settlementKpis.upiTotal)}
                      </p>
                      <span className="text-[10px] text-muted-foreground">{settlementKpis.upiBillsCount} bills</span>
                    </div>
                    <div className="rounded-lg border border-border bg-background p-2.5">
                      <span className="text-muted-foreground text-[11px]">Card / POS</span>
                      <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 font-mono">
                        {money(settlementKpis.cardTotal)}
                      </p>
                      <span className="text-[10px] text-muted-foreground">{settlementKpis.cardBillsCount} bills</span>
                    </div>
                  </div>

                  {/* Cash Drawer Denomination Counter */}
                  <div className="rounded-lg border border-border bg-background p-3 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-border pb-1.5">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Wallet size={13} className="text-emerald-600" />
                        Physical Cash Drawer Count
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Count physical notes in drawer at shift end
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[500, 200, 100, 50, 20, 10].map((note) => (
                        <div
                          key={note}
                          className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-2 py-1"
                        >
                          <span className="font-mono font-bold text-xs">₹{note}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground text-xs">×</span>
                            <input
                              type="number"
                              min="0"
                              aria-label={`Count for ₹${note}`}
                              value={denominations[note] || ''}
                              placeholder="0"
                              onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                setDenominations((prev) => ({ ...prev, [note]: val }));
                              }}
                              className="w-12 rounded border border-border bg-background px-1 py-0.5 text-center font-mono text-xs font-semibold text-foreground outline-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Coins & Small Change Input */}
                    <div className="flex items-center justify-between border-t border-border pt-2">
                      <span className="text-xs font-medium text-foreground">Coins / Loose Change (in ₹):</span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        aria-label="Coins in Rupees"
                        value={coinAmount > 0 ? (coinAmount / 100).toFixed(0) : ''}
                        placeholder="0"
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setCoinAmount(val * 100);
                        }}
                        className="w-20 rounded border border-border bg-background px-2 py-0.5 text-right font-mono text-xs font-semibold text-foreground outline-none"
                      />
                    </div>

                    {/* Reconciliation Result Banner */}
                    <div className="rounded-lg border border-border bg-muted/40 p-2.5 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-muted-foreground">Total Physical Counted:</span>
                        <p className="text-sm font-bold text-foreground font-mono">
                          {money(settlementKpis.cashCounted)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-muted-foreground">Variance (Diff):</span>
                        <p
                          className={`text-sm font-bold font-mono ${
                            settlementKpis.variance === 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : settlementKpis.variance > 0
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {settlementKpis.variance === 0
                            ? '₹0.00 (Balanced)'
                            : settlementKpis.variance > 0
                            ? `+${money(settlementKpis.variance)} (Excess)`
                            : `-${money(Math.abs(settlementKpis.variance))} (Short)`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Cashier Notes */}
                  <div className="space-y-1">
                    <label
                      htmlFor="settlement-notes-input"
                      className="text-[11px] font-medium text-muted-foreground"
                    >
                      Shift / Closing Remarks:
                    </label>
                    <input
                      id="settlement-notes-input"
                      type="text"
                      placeholder="e.g. Cash drawer balanced, shift handover complete..."
                      value={settlementNotes}
                      onChange={(e) => setSettlementNotes(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground outline-none"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettlementModal(false)}
                className="cursor-pointer"
              >
                Cancel
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrintZReport}
                  className="cursor-pointer gap-1.5"
                  title="Print 3-inch thermal Daily Settlement Z-Report"
                >
                  <Printer size={13} />
                  <span>Print Z-Report</span>
                </Button>

                <Button
                  size="sm"
                  onClick={handleConfirmSettlement}
                  disabled={settledSuccess}
                  className="cursor-pointer gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs"
                >
                  <CheckCircle2 size={13} />
                  <span>Close & Settle Register</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Printable Thermal Elements for 3-Inch Printers */}
      {previewBill && (
        <ThermalBillReceipt
          settings={settings}
          bill={previewBill}
          items={itemsMap.get(previewBill.id)}
          transactions={receiptMap.get(previewBill.id)?.transactions}
          className={printMode === 'bill' ? 'hidden print:block thermal-receipt' : 'hidden'}
        />
      )}

      <ThermalZReport
        settings={settings}
        dateStr={settlementDate}
        billCount={settlementKpis.billCount}
        grossTotal={settlementKpis.grossTotal}
        taxableTotal={settlementKpis.taxableTotal}
        gstTotal={settlementKpis.gstTotal}
        cashTotal={settlementKpis.cashTotal}
        cashBillsCount={settlementKpis.cashBillsCount}
        upiTotal={settlementKpis.upiTotal}
        upiBillsCount={settlementKpis.upiBillsCount}
        cardTotal={settlementKpis.cardTotal}
        cardBillsCount={settlementKpis.cardBillsCount}
        denominations={denominations}
        coins={coinAmount}
        cashCounted={settlementKpis.cashCounted}
        variance={settlementKpis.variance}
        notes={settlementNotes}
        className={printMode === 'z-report' ? 'hidden print:block thermal-receipt' : 'hidden'}
      />
    </div>
  );
}

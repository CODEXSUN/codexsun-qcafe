import { useState, useMemo, useRef, type KeyboardEvent, type RefObject } from 'react';
import { Banknote, CreditCard, QrCode, CheckCircle2, RotateCcw, ChevronDown, X } from 'lucide-react';
import { money } from '../api';
import type { PaymentMode, PaymentRecord } from './types';

const CURRENCY_NOTES = [500, 200, 100, 50, 20, 10] as const;

const POS_MACHINES = [
  'Machine 1 (Main Counter)',
  'Machine 2 (Wireless EDC)',
  'Machine 3 (UPI QR Stand)',
] as const;

function getDenominationsForAmount(rupees: number): Record<number, number> {
  const result: Record<number, number> = { 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0 };
  let remaining = Math.max(0, Math.floor(rupees));
  for (const note of CURRENCY_NOTES) {
    if (remaining >= note) {
      const count = Math.floor(remaining / note);
      result[note] = count;
      remaining -= count * note;
    }
  }
  return result;
}

export interface Pos1PaymentCollectorProps {
  total: number; // in paise
  payment?: PaymentRecord | null;
  onRecordPayment?: (record: PaymentRecord) => void;
  onClearPayment?: () => void;
  containerRef?: RefObject<HTMLDivElement | null>;
  onClose?: () => void;
}

export function Pos1PaymentCollector({
  total,
  payment,
  onRecordPayment,
  onClearPayment,
  containerRef,
  onClose,
}: Pos1PaymentCollectorProps) {
  const [selectedMode, setSelectedMode] = useState<PaymentMode>('cash');
  const [noteCounts, setNoteCounts] = useState<Record<number, number>>({
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
  });
  const [customTendered, setCustomTendered] = useState<string>('');
  const [selectedMachine, setSelectedMachine] = useState<string>(POS_MACHINES[0]);
  const [referenceNo, setReferenceNo] = useState<string>('-');
  const noteInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // Total cash from denomination notes
  const denoTotal = useMemo(() => {
    return Object.entries(noteCounts).reduce((acc, [denom, count]) => {
      return acc + Number(denom) * 100 * (count || 0);
    }, 0);
  }, [noteCounts]);

  // Actual cash tendered (uses custom input if typed, otherwise sum of denominations)
  const actualTendered = useMemo(() => {
    if (customTendered.trim()) {
      const parsed = parseFloat(customTendered.trim().replace(',', '.'));
      return !isNaN(parsed) && parsed >= 0 ? Math.round(parsed * 100) : 0;
    }
    return denoTotal > 0 ? denoTotal : 0;
  }, [customTendered, denoTotal]);

  const balance = actualTendered - total;

  function handleSetExact() {
    const rupees = Math.round(total / 100);
    setCustomTendered((total / 100).toFixed(2));
    setNoteCounts(getDenominationsForAmount(rupees));
  }

  function handleQuickTender(amountRupees: number) {
    setCustomTendered(amountRupees.toString());
    setNoteCounts(getDenominationsForAmount(amountRupees));
  }

  function handleSetNote(note: number, count: number) {
    setNoteCounts((prev) => {
      const updated = { ...prev, [note]: Math.max(0, count) };
      const newDenoSum = Object.entries(updated).reduce((acc, [d, c]) => {
        return acc + Number(d) * (c || 0);
      }, 0);
      setCustomTendered(newDenoSum > 0 ? newDenoSum.toString() : '');
      return updated;
    });
  }

  function handleAdjustNote(note: number, delta: number) {
    setNoteCounts((prev) => {
      const current = prev[note] || 0;
      const next = Math.max(0, current + delta);
      const updated = { ...prev, [note]: next };
      // Sync custom tendered to sum of denominations
      const newDenoSum = Object.entries(updated).reduce((acc, [d, c]) => {
        return acc + Number(d) * (c || 0);
      }, 0);
      setCustomTendered(newDenoSum > 0 ? newDenoSum.toString() : '');
      return updated;
    });
  }

  function handleNoteKeyDown(
    e: KeyboardEvent<HTMLInputElement>,
    note: number,
    index: number
  ) {
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      handleAdjustNote(note, 1);
      return;
    }
    if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      handleAdjustNote(note, -1);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleAdjustNote(note, 1);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleAdjustNote(note, -1);
      return;
    }
    if (e.key === 'ArrowRight') {
      if (index < CURRENCY_NOTES.length - 1) {
        e.preventDefault();
        const nextNote = CURRENCY_NOTES[index + 1]!;
        noteInputRefs.current[nextNote]?.focus();
        noteInputRefs.current[nextNote]?.select();
      }
      return;
    }
    if (e.key === 'ArrowLeft') {
      if (index > 0) {
        e.preventDefault();
        const prevNote = CURRENCY_NOTES[index - 1]!;
        noteInputRefs.current[prevNote]?.focus();
        noteInputRefs.current[prevNote]?.select();
      }
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (actualTendered >= total && total > 0) {
        handleRecord();
      } else if (index < CURRENCY_NOTES.length - 1) {
        const nextNote = CURRENCY_NOTES[index + 1]!;
        noteInputRefs.current[nextNote]?.focus();
        noteInputRefs.current[nextNote]?.select();
      } else {
        handleRecord();
      }
    }
  }

  function getFormattedTimestamp() {
    return new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }

  function handleRecord() {
    if (!total || total <= 0) return;
    const timestamp = getFormattedTimestamp();

    if (selectedMode === 'cash') {
      const effectiveTendered = actualTendered > 0 ? actualTendered : total;
      const effectiveBalance = effectiveTendered - total;
      onRecordPayment?.({
        mode: 'cash',
        amount: total,
        timestamp,
        tendered: effectiveTendered,
        balance: effectiveBalance,
        denominations: noteCounts,
      });
    } else {
      // UPI or Card
      onRecordPayment?.({
        mode: selectedMode,
        amount: total,
        timestamp,
        machineNo: selectedMachine,
        referenceNo: referenceNo.trim() || '-',
      });
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRecord();
    }
  }

  // If payment is already settled for this tab, show summary view
  if (payment) {
    return (
      <div
        ref={containerRef}
        className="rounded-xl border border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 transition-all space-y-2"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold text-xs">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
            <span>PAID {money(payment.amount)}</span>
            <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 font-bold tracking-wider">
              {payment.mode}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClearPayment}
              title="Edit or change payment method"
              className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-colors px-1.5 py-0.5 rounded hover:bg-black/5 dark:hover:bg-white/5"
            >
              <RotateCcw size={11} />
              <span>Edit</span>
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                title="Close (Esc)"
                className="grid size-5.5 place-items-center rounded-md text-muted-foreground hover:bg-black/10 hover:text-foreground dark:hover:bg-white/10 cursor-pointer transition-colors"
                aria-label="Close"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        <div className="text-[11px] text-muted-foreground flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 border-t border-emerald-500/20 pt-1.5">
          {payment.mode === 'cash' ? (
            <>
              <span>Tendered: <strong className="text-foreground">{money(payment.tendered ?? payment.amount)}</strong></span>
              <span>Change: <strong className="text-emerald-600 dark:text-emerald-400">{money(Math.max(0, payment.balance ?? 0))}</strong></span>
            </>
          ) : (
            <>
              <span>{payment.machineNo || 'POS Machine'}</span>
              <span>Ref: <strong className="font-mono text-foreground">{payment.referenceNo || '-'}</strong></span>
            </>
          )}
          <span className="text-[10px] font-mono text-muted-foreground/80">{payment.timestamp}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="space-y-2.5 transition-all"
      onKeyDown={handleKeyDown}
    >
      {/* 0. Header with Title, Total Badge, and Close Button */}
      <div className="flex items-center justify-between pb-1.5 border-b border-border/70">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-foreground">Settle Bill</span>
          <span className="text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900">
            {money(total)}
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            className="grid size-6 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
            aria-label="Close settlement sheet"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* 1. Payment Mode Selector Tabs (Highlighted with matching tone on select) */}
      <div className="grid grid-cols-3 gap-1.5 bg-muted/60 p-1 rounded-lg">
        <button
          type="button"
          onClick={() => setSelectedMode('cash')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold cursor-pointer transition-all ${
            selectedMode === 'cash'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-500/40 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700/50 shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
          }`}
        >
          <Banknote size={14} className={selectedMode === 'cash' ? 'text-emerald-600 dark:text-emerald-400' : ''} />
          <span>Cash</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedMode('upi')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold cursor-pointer transition-all ${
            selectedMode === 'upi'
              ? 'bg-blue-50 text-blue-800 border border-blue-500/40 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-700/50 shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
          }`}
        >
          <QrCode size={14} className={selectedMode === 'upi' ? 'text-blue-600 dark:text-blue-400' : ''} />
          <span>UPI</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedMode('card')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold cursor-pointer transition-all ${
            selectedMode === 'card'
              ? 'bg-purple-50 text-purple-800 border border-purple-500/40 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-700/50 shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
          }`}
        >
          <CreditCard size={14} className={selectedMode === 'card' ? 'text-purple-600 dark:text-purple-400' : ''} />
          <span>Card</span>
        </button>
      </div>

      {/* 2. Cash Mode Subview */}
      {selectedMode === 'cash' && (
        <div className="space-y-2">
          {/* Quick Tender Chips & Direct Input */}
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">₹</span>
              <input
                type="text"
                inputMode="decimal"
                aria-label="Cash Tendered Amount"
                value={customTendered}
                onChange={(e) => setCustomTendered(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const firstNote = CURRENCY_NOTES[0];
                    noteInputRefs.current[firstNote]?.focus();
                    noteInputRefs.current[firstNote]?.select();
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleRecord();
                  }
                }}
                placeholder={(total / 100).toFixed(2)}
                className="w-full h-8 pl-6 pr-2 rounded-lg border border-border bg-background text-xs font-bold outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              type="button"
              onClick={handleSetExact}
              className="h-8 px-2 rounded-lg border border-border bg-muted/40 hover:bg-muted text-[11px] font-semibold text-foreground cursor-pointer transition-colors shrink-0"
              title="Pay Exact Amount"
            >
              Exact
            </button>
            <button
              type="button"
              onClick={() => handleQuickTender(500)}
              className="h-8 px-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-[11px] font-semibold text-foreground cursor-pointer transition-colors shrink-0"
            >
              ₹500
            </button>
            <button
              type="button"
              onClick={() => handleQuickTender(1000)}
              className="h-8 px-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-[11px] font-semibold text-foreground cursor-pointer transition-colors shrink-0"
            >
              ₹1000
            </button>
            <button
              type="button"
              onClick={() => handleQuickTender(2000)}
              className="h-8 px-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-[11px] font-semibold text-foreground cursor-pointer transition-colors shrink-0"
            >
              ₹2000
            </button>
          </div>

          {/* Balance / Change Due (Always shown) */}
          <div className="flex items-center justify-between bg-muted/30 px-2.5 py-1.5 rounded-lg border border-border/60">
            <div className="text-xs">
              {balance >= 0 ? (
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  Change: <strong>₹{(balance / 100).toFixed(2)}</strong>
                </span>
              ) : (
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  Short: <strong>₹{(Math.abs(balance) / 100).toFixed(2)}</strong>
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Denominations
            </span>
          </div>

          {/* Denominations ("Deno") Grid (Always shown for Cash with Keyboard count input & +/- support) */}
          <div className="bg-muted/40 p-2 rounded-lg border border-border/80 grid grid-cols-3 gap-1.5">
            {CURRENCY_NOTES.map((note, index) => {
              const count = noteCounts[note] || 0;
              return (
                <div
                  key={note}
                  className="flex items-center justify-between bg-background border border-border px-1.5 py-1 rounded-md shadow-2xs"
                >
                  <span className="text-[11px] font-bold text-foreground select-none">₹{note}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => handleAdjustNote(note, -1)}
                      className="size-4.5 rounded grid place-items-center text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
                      title={`Decrease ₹${note} note (-)`}
                    >
                      -
                    </button>
                    <input
                      ref={(el) => {
                        noteInputRefs.current[note] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      aria-label={`Count for ₹${note} note`}
                      value={count === 0 ? '' : count.toString()}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/\D/g, '');
                        const val = clean === '' ? 0 : parseInt(clean, 10);
                        handleSetNote(note, val);
                      }}
                      onKeyDown={(e) => handleNoteKeyDown(e, note, index)}
                      className="w-7 h-5 text-center text-xs font-mono font-bold bg-muted/30 border border-border/80 rounded text-foreground outline-none focus:bg-background focus:border-primary focus:ring-1 focus:ring-primary select-all"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => handleAdjustNote(note, 1)}
                      className="size-4.5 rounded grid place-items-center text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
                      title={`Increase ₹${note} note (+)`}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Record Cash Button */}
          <button
            type="button"
            onClick={handleRecord}
            disabled={!total || total <= 0}
            className="w-full h-8 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-semibold shadow-xs cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckCircle2 size={14} />
            <span>Record Cash Payment</span>
          </button>
        </div>
      )}

      {/* 3. UPI / Card Mode Subview */}
      {(selectedMode === 'upi' || selectedMode === 'card') && (
        <div className="space-y-2">
          {/* Machine Selection */}
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground font-medium block">
              POS Machine No:
            </span>
            <div className="relative">
              <select
                aria-label="POS Cash Machine No"
                value={selectedMachine}
                onChange={(e) => setSelectedMachine(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-xs font-semibold text-foreground outline-none cursor-pointer focus:border-primary focus:ring-1 focus:ring-primary appearance-none"
              >
                {POS_MACHINES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
            </div>
          </div>

          {/* Reference # Input */}
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground font-medium block">
              {selectedMode === 'upi' ? 'UPI Ref / UTR #:' : 'Card Approval / Ref #:'}
            </span>
            <input
              type="text"
              aria-label="Payment Reference No"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="Ref # or -"
              className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-xs font-mono font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Record Button */}
          <button
            type="button"
            onClick={handleRecord}
            disabled={!total || total <= 0}
            className={`w-full h-8 flex items-center justify-center gap-1.5 rounded-lg text-white text-xs font-semibold shadow-xs cursor-pointer transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed ${
              selectedMode === 'upi'
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            <CheckCircle2 size={14} />
            <span>Record {selectedMode.toUpperCase()} Payment</span>
          </button>
        </div>
      )}
    </div>
  );
}

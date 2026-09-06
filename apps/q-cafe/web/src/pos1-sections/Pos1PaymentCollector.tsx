import { useState, useMemo, useRef, useEffect, type KeyboardEvent, type RefObject } from 'react';
import { Banknote, CreditCard, QrCode, CheckCircle2, RotateCcw, ChevronDown, X } from 'lucide-react';
import { money } from '../api';
import type { PaymentMode, PaymentRecord } from './types';

const CURRENCY_NOTES = [500, 200, 100, 50, 20, 10] as const;

const POS_MACHINES = [
  'Machine 1 (Main Counter)',
  'Machine 2 (Wireless EDC)',
  'Machine 3 (UPI QR Stand)',
] as const;

function formatTenderRupees(paise: number): string {
  const rupees = paise / 100;
  return Number.isInteger(rupees) ? rupees.toString() : rupees.toFixed(2);
}

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
  const [customTendered, setCustomTendered] = useState<string>(() =>
    total > 0 ? formatTenderRupees(total) : ''
  );
  const [selectedMachine, setSelectedMachine] = useState<string>(POS_MACHINES[0]);
  const [referenceNo, setReferenceNo] = useState<string>('-');
  const amountInputRef = useRef<HTMLInputElement | null>(null);

  // Sync customTendered when total changes
  useEffect(() => {
    if (total > 0) {
      setCustomTendered(formatTenderRupees(total));
    }
  }, [total]);

  // Focus and select amount input when cash mode is active
  useEffect(() => {
    if (selectedMode === 'cash' && !payment) {
      requestAnimationFrame(() => {
        amountInputRef.current?.focus();
        amountInputRef.current?.select();
      });
    }
  }, [selectedMode, payment]);

  // Actual cash tendered (parsed from input, defaults to total if empty)
  const actualTendered = useMemo(() => {
    if (customTendered.trim()) {
      const parsed = parseFloat(customTendered.trim().replace(',', '.'));
      return !isNaN(parsed) && parsed >= 0 ? Math.round(parsed * 100) : 0;
    }
    return total > 0 ? total : 0;
  }, [customTendered, total]);

  const balance = actualTendered - total;

  function handleSetExact() {
    setCustomTendered(formatTenderRupees(total));
    requestAnimationFrame(() => {
      amountInputRef.current?.focus();
      amountInputRef.current?.select();
    });
  }

  function handleQuickTender(amountRupees: number) {
    setCustomTendered(amountRupees.toString());
    requestAnimationFrame(() => {
      amountInputRef.current?.focus();
      amountInputRef.current?.select();
    });
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
      const effectiveBalance = Math.max(0, effectiveTendered - total);
      onRecordPayment?.({
        mode: 'cash',
        amount: total,
        timestamp,
        tendered: effectiveTendered,
        balance: effectiveBalance,
        denominations: getDenominationsForAmount(Math.round(effectiveTendered / 100)),
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
    if (e.key === 'Escape' && onClose) {
      e.preventDefault();
      onClose();
    }
  }

  // If payment is already settled for this tab, show paid summary view
  if (payment) {
    return (
      <div
        ref={containerRef}
        className="rounded-2xl border border-emerald-500/30 bg-[#ECFDF5] dark:bg-emerald-950/30 p-4 transition-all space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
            <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
            <span>PAID {money(payment.amount)}</span>
            <span className="text-[11px] uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 font-bold tracking-wider">
              {payment.mode}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClearPayment}
              title="Edit or change payment method"
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-colors px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
            >
              <RotateCcw size={12} />
              <span>Edit</span>
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                title="Close (Esc)"
                className="grid size-6 place-items-center rounded-lg text-muted-foreground hover:bg-black/10 hover:text-foreground dark:hover:bg-white/10 cursor-pointer transition-colors"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-emerald-500/20 pt-2.5">
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
          <span className="text-[11px] font-mono text-muted-foreground/80">{payment.timestamp}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="space-y-4 transition-all"
      onKeyDown={handleKeyDown}
    >
      {/* 1. Header: Settle Bill title + Close (X) button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground tracking-tight">Settle Bill</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
            aria-label="Close settlement"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* 2. Total Amount Card (Mint background with bold amount) */}
      <div className="rounded-2xl bg-[#ECFDF5] dark:bg-emerald-950/40 p-4 border border-emerald-500/10">
        <span className="text-xs sm:text-sm font-medium text-emerald-900/70 dark:text-emerald-300/70 block">
          Total Amount
        </span>
        <div className="text-3xl font-extrabold text-foreground tracking-tight mt-0.5">
          {money(total)}
        </div>
      </div>

      {/* 3. Payment Mode Tabs: Cash, UPI / QR, Card */}
      <div className="grid grid-cols-3 gap-2.5">
        <button
          type="button"
          onClick={() => setSelectedMode('cash')}
          className={`flex items-center justify-center gap-2 py-3 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            selectedMode === 'cash'
              ? 'border-2 border-emerald-500 bg-[#ECFDF5] dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
              : 'border-2 border-transparent bg-muted/60 dark:bg-muted/40 text-foreground/80 hover:bg-muted font-medium'
          }`}
        >
          <Banknote className="size-5 shrink-0" />
          <span>Cash</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedMode('upi')}
          className={`flex items-center justify-center gap-2 py-3 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            selectedMode === 'upi'
              ? 'border-2 border-emerald-500 bg-[#ECFDF5] dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
              : 'border-2 border-transparent bg-muted/60 dark:bg-muted/40 text-foreground/80 hover:bg-muted font-medium'
          }`}
        >
          <QrCode className="size-5 shrink-0" />
          <span>UPI / QR</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedMode('card')}
          className={`flex items-center justify-center gap-2 py-3 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            selectedMode === 'card'
              ? 'border-2 border-emerald-500 bg-[#ECFDF5] dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
              : 'border-2 border-transparent bg-muted/60 dark:bg-muted/40 text-foreground/80 hover:bg-muted font-medium'
          }`}
        >
          <CreditCard className="size-5 shrink-0" />
          <span>Card</span>
        </button>
      </div>

      {/* 4. Cash Mode: Amount Received (with Exact, ₹500, ₹1000, ₹2000 chips) + Change side-by-side */}
      {selectedMode === 'cash' && (
        <div className="flex gap-3 items-stretch">
          {/* Left: Amount Received + Quick Chips */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <label className="text-xs sm:text-sm font-medium text-muted-foreground block mb-1.5">
                Amount Received
              </label>
              <div className="relative flex items-center h-13 rounded-xl border-2 border-emerald-500 bg-background px-3 shadow-2xs focus-within:ring-2 focus-within:ring-emerald-500/20">
                <span className="text-xl font-bold text-foreground select-none">₹</span>
                <span className="mx-2.5 h-6 w-px bg-border shrink-0" />
                <input
                  ref={amountInputRef}
                  type="text"
                  inputMode="decimal"
                  aria-label="Amount Received"
                  value={customTendered}
                  onChange={(e) => setCustomTendered(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleRecord();
                    }
                  }}
                  placeholder={(total / 100).toFixed(0)}
                  className="w-full bg-transparent text-2xl font-bold text-foreground outline-none tracking-tight"
                />
              </div>
            </div>

            {/* Quick Chips below input: Exact, ₹500, ₹1000, ₹2000 */}
            <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
              <button
                type="button"
                onClick={handleSetExact}
                className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-[#ECFDF5] dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer"
              >
                Exact
              </button>
              <button
                type="button"
                onClick={() => handleQuickTender(500)}
                className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-muted/70 hover:bg-muted dark:bg-muted/50 text-foreground transition-colors cursor-pointer"
              >
                ₹500
              </button>
              <button
                type="button"
                onClick={() => handleQuickTender(1000)}
                className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-muted/70 hover:bg-muted dark:bg-muted/50 text-foreground transition-colors cursor-pointer"
              >
                ₹1000
              </button>
              <button
                type="button"
                onClick={() => handleQuickTender(2000)}
                className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-muted/70 hover:bg-muted dark:bg-muted/50 text-foreground transition-colors cursor-pointer"
              >
                ₹2000
              </button>
            </div>
          </div>

          {/* Right: Change box */}
          <div className="w-28 sm:w-36 shrink-0 rounded-2xl bg-muted/40 dark:bg-muted/30 border border-border/50 p-3.5 flex flex-col justify-center">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground block">
              Change
            </span>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 truncate">
              ₹{(Math.max(0, balance) / 100).toFixed(2)}
            </div>
            {balance < 0 && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                Short: ₹{(Math.abs(balance) / 100).toFixed(2)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 5. UPI Mode Subview */}
      {selectedMode === 'upi' && (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs sm:text-sm font-medium text-muted-foreground block">
              POS Machine
            </label>
            <div className="relative">
              <select
                aria-label="POS Machine"
                value={selectedMachine}
                onChange={(e) => setSelectedMachine(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm font-semibold text-foreground outline-none cursor-pointer focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 appearance-none"
              >
                {POS_MACHINES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs sm:text-sm font-medium text-muted-foreground block">
              UPI Ref / UTR #
            </label>
            <input
              type="text"
              aria-label="Payment Reference No"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="Ref # or -"
              className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm font-mono font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>
      )}

      {/* 6. Card Mode Subview */}
      {selectedMode === 'card' && (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs sm:text-sm font-medium text-muted-foreground block">
              POS Machine
            </label>
            <div className="relative">
              <select
                aria-label="POS Machine"
                value={selectedMachine}
                onChange={(e) => setSelectedMachine(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm font-semibold text-foreground outline-none cursor-pointer focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 appearance-none"
              >
                {POS_MACHINES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs sm:text-sm font-medium text-muted-foreground block">
              Card Approval / Ref #
            </label>
            <input
              type="text"
              aria-label="Payment Reference No"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="Ref # or -"
              className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm font-mono font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>
      )}

      {/* 7. Bottom Action Button: Complete Payment */}
      <button
        type="button"
        onClick={handleRecord}
        disabled={!total || total <= 0}
        className="w-full py-3.5 px-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm sm:text-base shadow-sm cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <CheckCircle2 size={20} className="stroke-[2.2]" />
        <span>Complete Payment</span>
      </button>
    </div>
  );
}

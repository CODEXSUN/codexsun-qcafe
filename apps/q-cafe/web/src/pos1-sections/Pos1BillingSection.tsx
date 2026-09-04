import { ArrowRight, CheckCircle2, Minus, Plus, ReceiptText, Trash2 } from 'lucide-react';
import { TopologyMarker } from '@codexsun/devkit-ito';
import { money } from '../api';
import type { Pos1BillingSectionProps } from './types';
import { Pos1PaymentCollector } from './Pos1PaymentCollector';

export function Pos1BillingSection({
  topology,
  activeTab,
  tableName,
  lines,
  subtotal,
  totalQuantity,
  gstApplied,
  gstAmount,
  total,
  cafeSettings,
  onToggleGst,
  onIncrementLine,
  onDecrementLine,
  onRemoveLine,
  formatChair,
  onRecordPayment,
  onClearPayment,
  collectorRef,
  showPaymentCollector,
  onTogglePaymentCollector,
  onClosePaymentCollector,
  onNextOrder,
  nextButtonRef,
}: Pos1BillingSectionProps) {
  return (
    <div
      className={`ito-region relative flex flex-col w-[410px] lg:w-[440px] shrink-0 rounded-2xl bg-card overflow-hidden transition-all duration-300 ${
        activeTab.payment
          ? 'border-2 border-emerald-500 shadow-xl shadow-emerald-500/20 ring-4 ring-emerald-500/10'
          : 'border border-border shadow-sm'
      }`}
      {...topology.regionProps('q12.3')}
    >
      <TopologyMarker id="q12.3" topology={topology} />

      {/* Cart Sub-Header: Active Order & Table Indicator */}
      <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5 bg-muted/20">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-foreground">{activeTab.name}</span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs font-semibold text-muted-foreground">Table {tableName}</span>
        </div>
        <span className="text-[11px] font-semibold text-muted-foreground">
          {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Cart Table Container */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-slim">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-card z-10 border-b border-border/80 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-2.5 w-7 text-center">#</th>
              <th className="py-2.5 px-2.5">Item Name</th>
              <th className="py-2.5 px-1.5 w-24 text-center">Qty</th>
              <th className="py-2.5 px-1.5 w-16 text-right">Rate</th>
              <th className="py-2.5 px-2.5 w-20 text-right">Amount</th>
              <th className="py-2.5 px-2 w-8 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {lines.map((line, index) => (
              <tr key={line.key} className="hover:bg-muted/30 transition-colors">
                <td className="py-2.5 px-2.5 text-muted-foreground font-mono text-center">{index + 1}</td>
                <td className="py-2.5 px-2.5 min-w-0">
                  <div className="font-semibold text-foreground truncate" title={line.name}>
                    {line.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono whitespace-nowrap mt-0.5">
                    {line.code} {line.chair ? `• Seat ${formatChair(tableName, line.chair)}` : ''}
                  </div>
                </td>
                <td className="py-2.5 px-1.5 text-center">
                  {/* Quantity Stepper: [-] QTY [+] */}
                  <div className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-1 py-0.5 gap-1.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => onDecrementLine(line.key)}
                      className="grid size-5 place-items-center rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="w-4 text-center font-bold text-foreground text-xs select-none">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onIncrementLine(line.key)}
                      className="grid size-5 place-items-center rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                </td>
                <td className="py-2.5 px-1.5 text-right font-medium text-muted-foreground whitespace-nowrap">
                  {money(line.price)}
                </td>
                <td className="py-2.5 px-2.5 text-right font-bold text-foreground whitespace-nowrap">
                  {money(line.price * line.quantity)}
                </td>
                <td className="py-2.5 px-2 text-right">
                  <button
                    type="button"
                    onClick={() => onRemoveLine(line.key)}
                    className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer transition-colors"
                    aria-label={`Remove ${line.name}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}

            {lines.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted-foreground">
                  Cart is empty. Click items from the catalog or add below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Dimmed backdrop when floating collector is open */}
      <div
        className={`absolute inset-0 z-30 bg-black/25 backdrop-blur-[1px] transition-opacity duration-200 ${
          showPaymentCollector ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClosePaymentCollector}
      />

      {/* Floating Payment Collector Sheet (Mild Fly from Bottom Animation) */}
      <div
        className={`absolute inset-x-2.5 bottom-[62px] z-40 max-h-[calc(100%-74px)] overflow-y-auto scrollbar-slim rounded-2xl border border-border bg-card/98 backdrop-blur-md p-3 shadow-2xl transition-all duration-250 ease-out transform ${
          showPaymentCollector
            ? 'translate-y-0 opacity-100 scale-100 pointer-events-auto'
            : 'translate-y-6 opacity-0 scale-[0.98] pointer-events-none'
        }`}
      >
        <Pos1PaymentCollector
          total={total}
          payment={activeTab.payment}
          onRecordPayment={onRecordPayment}
          onClearPayment={onClearPayment}
          containerRef={collectorRef}
          onClose={onClosePaymentCollector}
        />
      </div>

      {/* Floating Next Order Action when Paid */}
      {activeTab.payment && !showPaymentCollector && (
        <div className="absolute inset-x-0 bottom-[68px] z-30 flex justify-center px-4 pointer-events-none animate-in fade-in slide-in-from-bottom-3 duration-200">
          <button
            ref={nextButtonRef}
            type="button"
            onClick={onNextOrder}
            className="pointer-events-auto flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-xl shadow-emerald-600/35 border border-emerald-400/50 cursor-pointer transition-all ring-4 ring-emerald-500/20 hover:ring-emerald-500/30"
          >
            <span>Next Order</span>
            <kbd className="font-mono text-[10px] font-bold bg-white/20 text-white px-1.5 py-0.5 rounded-md border border-white/30 select-none">
              Enter ↵
            </kbd>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Cart Footer: GST + Settle Shortcut + Totals */}
      <div className="relative z-20 border-t border-border bg-muted/20 p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleGst}
            className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              gstApplied
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-foreground hover:bg-muted'
            }`}
          >
            {gstApplied ? <CheckCircle2 size={13} /> : <Plus size={13} />}
            <span>{gstApplied ? `GST (${cafeSettings.defaultGstRate ?? 5}%)` : 'Add GST'}</span>
          </button>

          {/* Settle (F5) Button */}
          <button
            type="button"
            onClick={onTogglePaymentCollector}
            disabled={!lines.length}
            aria-label={activeTab.payment ? `Paid via ${activeTab.payment.mode}` : 'Settle Bill (F5)'}
            className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              activeTab.payment
                ? 'border-emerald-500/60 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                : showPaymentCollector
                ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                : 'border-border bg-card text-foreground hover:bg-muted'
            }`}
          >
            {activeTab.payment ? (
              <>
                <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                <span className="uppercase text-[11px] font-bold">{activeTab.payment.mode} Paid</span>
              </>
            ) : (
              <>
                <ReceiptText size={13} className={showPaymentCollector ? 'text-white' : 'text-muted-foreground'} />
                <span>Settle</span>
                <kbd
                  className={`font-mono text-[10px] font-semibold px-1 py-0.5 rounded border select-none ${
                    showPaymentCollector
                      ? 'bg-white/20 text-white border-white/30'
                      : 'bg-muted text-muted-foreground border-border'
                  }`}
                >
                  F5
                </kbd>
              </>
            )}
          </button>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            TOTAL
          </span>
          <span className="text-2xl font-black tracking-tight text-blue-600 dark:text-blue-400">
            {money(total)}
          </span>
        </div>
      </div>
    </div>
  );
}

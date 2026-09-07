import { ArrowRight, Minus, Plus, Trash2 } from 'lucide-react';
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
  total,
  onIncrementLine,
  onDecrementLine,
  onRemoveLine,
  formatChair,
  onRecordPayment,
  onClearPayment,
  collectorRef,
  showPaymentCollector,
  onClosePaymentCollector,
  onNextOrder,
  nextButtonRef,
  previousBills,
  showCollectedBills,
  previousBillPage,
  previousBillPageCount,
}: Pos1BillingSectionProps) {
  const collectedBillsTotal = previousBills.reduce((sum, bill) => sum + bill.total, 0);
  const hasCashPayment = previousBills.some((bill) => bill.paidWithCash);
  const footerTotal = showCollectedBills ? collectedBillsTotal : total;

  return (
    <div
      className={`ito-region relative flex w-[410px] shrink-0 flex-col overflow-hidden rounded-2xl bg-card shadow-sm lg:w-[440px] ${
        showCollectedBills ? 'border-2 border-emerald-500' : 'border border-border'
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
          {activeTab.chair && (
            <>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs font-semibold text-primary">
                {activeTab.chair.includes(',')
                  ? `Seats ${formatChair(tableName, activeTab.chair)}`
                  : `Seat ${formatChair(tableName, activeTab.chair)}`}
              </span>
            </>
          )}
        </div>
        <span className="text-[11px] font-semibold text-muted-foreground">
          {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Cart Table Container */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-slim">
        {lines.length > 0 ? (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-card z-10 border-b border-border/80 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-2.5 w-7 text-center">#</th>
                <th className="py-2.5 px-2.5">Item Name</th>
                <th className="py-2.5 px-1.5 w-24 text-center">Qty</th>
                <th className="py-2.5 px-1.5 w-16 text-right">Rate</th>
                <th className="py-2.5 px-2.5 w-20 text-right">Amount</th>
                <th className="py-2.5 px-2 w-8 text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {lines.map((line, index) => (
                <tr key={line.key} className="transition-colors hover:bg-muted/30">
                  <td className="py-2.5 px-2.5 text-center font-mono text-muted-foreground">{index + 1}</td>
                  <td className="min-w-0 py-2.5 px-2.5">
                    <div className="truncate font-semibold text-foreground" title={line.name}>{line.name}</div>
                    <div className="mt-0.5 whitespace-nowrap font-mono text-[10px] text-muted-foreground">
                      {line.code} {line.chair ? `• Seat ${formatChair(tableName, line.chair)}` : ''}
                    </div>
                  </td>
                  <td className="py-2.5 px-1.5 text-center">
                    <div className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-1 py-0.5 shadow-2xs">
                      <button type="button" onClick={() => onDecrementLine(line.key)} className="grid size-5 cursor-pointer place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Decrease quantity"><Minus size={11} /></button>
                      <span className="w-4 select-none text-center text-xs font-bold text-foreground">{line.quantity}</span>
                      <button type="button" onClick={() => onIncrementLine(line.key)} className="grid size-5 cursor-pointer place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Increase quantity"><Plus size={11} /></button>
                    </div>
                  </td>
                  <td className="whitespace-nowrap py-2.5 px-1.5 text-right font-medium text-muted-foreground">{money(line.price)}</td>
                  <td className="whitespace-nowrap py-2.5 px-2.5 text-right font-bold text-foreground">{money(line.price * line.quantity)}</td>
                  <td className="py-2.5 px-2 text-right">
                    <button type="button" onClick={() => onRemoveLine(line.key)} className="grid size-6 cursor-pointer place-items-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive" aria-label={`Remove ${line.name}`}><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : showCollectedBills && previousBills.length > 0 ? (
          <table className="w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-border/80 bg-card text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="w-8 px-2.5 py-2.5 text-center">#</th>
                <th className="px-2.5 py-2.5">Bill no.</th>
                <th className="px-2.5 py-2.5">Table</th>
                <th className="px-2.5 py-2.5">Collected</th>
                <th className="w-24 px-2.5 py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {previousBills.map((bill, index) => (
                <tr key={bill.billNo} className="transition-colors hover:bg-muted/30">
                  <td className="px-2.5 py-3 text-center font-mono text-muted-foreground">
                    {index + 1}
                  </td>
                  <td className="px-2.5 py-3 font-semibold text-foreground">{bill.billNo}</td>
                  <td className="px-2.5 py-3 text-muted-foreground">{bill.tableNo}</td>
                  <td className="px-2.5 py-3 text-muted-foreground">{bill.collectedAt}</td>
                  <td className="whitespace-nowrap px-2.5 py-3 text-right font-bold text-foreground">{money(bill.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="min-h-40 flex-1" aria-label="Empty order" />}
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
        className={`absolute inset-x-2.5 bottom-[62px] z-40 max-h-[calc(100%-74px)] overflow-y-auto scrollbar-slim rounded-2xl border border-border bg-card/98 backdrop-blur-md p-4 shadow-2xl transition-all duration-250 ease-out transform ${
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

      {/* Cart Footer: totals only. Settlement remains in the top action bar. */}
      <div className="relative z-20 flex justify-end border-t border-border bg-muted/20 p-3">
        <div className="flex w-full items-baseline justify-between gap-3">
          {showCollectedBills && hasCashPayment ? (
            <span className="rounded-md border-2 border-emerald-600 px-2 py-0.5 text-xs font-black tracking-[0.14em] text-emerald-700 dark:border-emerald-400 dark:text-emerald-300">
              PAID · CASH
            </span>
          ) : <span />}
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">TOTAL</span>
            <span className="text-2xl font-black tracking-tight text-blue-600 dark:text-blue-400">
              {money(footerTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

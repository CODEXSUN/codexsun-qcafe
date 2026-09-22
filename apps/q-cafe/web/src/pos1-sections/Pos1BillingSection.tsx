import { CheckCircle2, Minus, Plus, Trash2 } from 'lucide-react';
import { TopologyMarker } from '@codexsun/devkit-ito';
import { money } from '../api';
import type { Pos1BillingSectionProps } from './types';

export function Pos1BillingSection({
  topology,
  activeTab,
  tableName,
  lines,
  subtotal,
  totalQuantity,
  total,
  orderMode,
  onChangeOrderMode,
  onClearUnsavedOrder,
  onIncrementLine,
  onDecrementLine,
  onRemoveLine,
  formatChair,
  onFocusPayment,
}: Pos1BillingSectionProps) {
  return (
    <div
      className="ito-region relative flex w-[410px] shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:w-[440px]"
      {...topology.regionProps('q12.3')}
    >
      <TopologyMarker id="q12.3" topology={topology} />

      {/* Cart Sub-Header: Active Order & Table Indicator */}
      <div className="flex h-13 items-center justify-between border-b border-border bg-muted/20 px-3.5">
        <div className="flex items-center gap-2">
          <select
            value={orderMode}
            onChange={(event) => onChangeOrderMode(event.target.value as typeof orderMode)}
            aria-label="Order mode (F1)"
            title="Order mode (F1)"
            className="h-7 cursor-pointer rounded-md border border-border bg-background px-2 text-[11px] font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="POS">POS</option>
            <option value="KOT">KOT</option>
            <option value="TAKE AWAY">TAKE AWAY</option>
          </select>
          <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">F1</kbd>
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
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-muted-foreground">
            {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}
          </span>
          <button
            type="button"
            onClick={onClearUnsavedOrder}
            disabled={lines.length === 0}
            aria-label="Clear current order"
            title="Clear current order"
            className="grid size-7 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Trash2 size={14} />
          </button>
        </div>
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
                  </td>
                  <td className="py-2.5 px-1.5 text-center">
                    <div className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-1 py-0.5 shadow-2xs">
                      <button type="button" onClick={() => onDecrementLine(line.key)} disabled={line.quantity <= 1} className="grid size-5 cursor-pointer place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35" aria-label="Decrease quantity"><Minus size={11} /></button>
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
        ) : <div className="min-h-40 flex-1" aria-label="Empty order" />}
      </div>

      {/* Cart Footer: settlement and collected bills are in the right drawer. */}
      <div className="relative z-20 flex justify-end border-t border-border bg-muted/20 p-3">
        <div className="flex w-full items-center justify-between gap-3">
          <div>
            {onFocusPayment && (
              activeTab.payment ? (
                <button
                  type="button"
                  onClick={onFocusPayment}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/60 bg-emerald-50 px-2.5 py-1 text-xs font-bold uppercase text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 cursor-pointer"
                  aria-label="Payment settled"
                >
                  <CheckCircle2 size={13} />
                  <span>{activeTab.payment.mode}</span>
                  <span className="text-[10px] font-normal lowercase text-muted-foreground">(edit)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onFocusPayment}
                  disabled={lines.length === 0}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  aria-label="Choose payment method"
                >
                  <span>Pay</span>
                  <kbd className="font-mono text-[9px] bg-muted px-1 py-0.5 rounded border border-border">F7</kbd>
                </button>
              )
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">TOTAL</span>
            <span className="text-2xl font-black tracking-tight text-blue-600 dark:text-blue-400">
              {money(total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

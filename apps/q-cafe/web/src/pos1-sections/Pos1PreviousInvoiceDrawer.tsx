import { ChevronLeft, ChevronRight, ReceiptText } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@codexsun/ui/components/ui/sheet';
import { money } from '../api';
import type { PreviousBill } from './types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: PreviousBill;
  invoiceNumber: number;
  invoiceCount: number;
  onOlderInvoice: () => void;
  onNewerInvoice: () => void;
};

export function Pos1PreviousInvoiceDrawer({
  open,
  onOpenChange,
  invoice,
  invoiceNumber,
  invoiceCount,
  onOlderInvoice,
  onNewerInvoice,
}: Props) {
  const canShowNewer = invoiceNumber > 1;
  const canShowOlder = invoiceNumber < invoiceCount;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[30rem]">
        <SheetHeader className="border-b border-border px-5 py-4 pr-12 text-left">
          <SheetTitle className="flex items-center gap-2"><ReceiptText size={18} /> Previous invoice</SheetTitle>
          <SheetDescription>Use Page Up and Page Down to move between paid invoices.</SheetDescription>
        </SheetHeader>

        {!invoice ? (
          <p className="p-5 text-sm text-muted-foreground">No paid invoices are available.</p>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <article className="overflow-hidden rounded-2xl border-2 border-emerald-500 bg-card">
              <header className="flex items-start justify-between gap-3 border-b border-emerald-500/30 bg-emerald-50/60 px-4 py-3 dark:bg-emerald-950/20">
                <div>
                  <p className="text-sm font-black text-foreground">{invoice.billNo}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Table {invoice.tableNo} · {invoice.collectedAt}</p>
                </div>
                <span className="rounded-md border-2 border-emerald-600 px-2 py-1 text-[11px] font-black tracking-[0.12em] text-emerald-700 dark:border-emerald-400 dark:text-emerald-300">
                  PAID · {invoice.paymentMode}
                </span>
              </header>

              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <tr><th className="px-4 py-2.5">Item</th><th className="px-2 py-2.5 text-center">Qty</th><th className="px-4 py-2.5 text-right">Amount</th></tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {invoice.items.map((item, index) => (
                    <tr key={`${item.name}-${index}`}>
                      <td className="px-4 py-3"><p className="font-semibold text-foreground">{item.name}</p><p className="text-[11px] text-muted-foreground">{money(item.rate)}</p></td>
                      <td className="px-2 py-3 text-center font-semibold text-foreground">{item.quantity}</td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">{money(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <footer className="flex items-baseline justify-end gap-2 border-t border-emerald-500 bg-emerald-50/60 px-4 py-4 dark:bg-emerald-950/20">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total</span>
                <span className="text-2xl font-black tracking-tight text-blue-600 dark:text-blue-400">{money(invoice.total)}</span>
              </footer>
            </article>
          </div>
        )}

        <footer className="flex items-center justify-between border-t border-border px-5 py-3">
          <button type="button" onClick={onOlderInvoice} disabled={!canShowOlder} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={15} /> Older <kbd className="font-mono text-[10px]">PgUp</kbd></button>
          <span className="text-xs font-medium text-muted-foreground">{invoiceCount ? `${invoiceNumber} / ${invoiceCount}` : '0 / 0'}</span>
          <button type="button" onClick={onNewerInvoice} disabled={!canShowNewer} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"><kbd className="font-mono text-[10px]">PgDn</kbd> Newer <ChevronRight size={15} /></button>
        </footer>
      </SheetContent>
    </Sheet>
  );
}

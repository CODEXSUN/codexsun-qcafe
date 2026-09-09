import { CheckCircle2, ReceiptText } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@codexsun/ui/components/ui/sheet';
import { money } from '../api';
import { Pos1PaymentCollector } from './Pos1PaymentCollector';
import type { PaymentRecord, PreviousBill } from './types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previousBills: PreviousBill[];
  linesCount: number;
  total: number;
  payment?: PaymentRecord | null;
  showPaymentCollector: boolean;
  cashReceiptRequest: number;
  onOpenPaymentCollector: () => void;
  onClosePaymentCollector: () => void;
  onRecordPayment: (payment: PaymentRecord) => void;
  onClearPayment: () => void;
};

export function Pos1BillsDrawer({
  open,
  onOpenChange,
  previousBills,
  linesCount,
  total,
  payment,
  showPaymentCollector,
  cashReceiptRequest,
  onOpenPaymentCollector,
  onClosePaymentCollector,
  onRecordPayment,
  onClearPayment,
}: Props) {
  const collectedTotal = previousBills.reduce((sum, bill) => sum + bill.total, 0);
  const hasCashPayment = previousBills.some((bill) => bill.paidWithCash);

  function closeDrawer() {
    onClosePaymentCollector();
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : closeDrawer())}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[30rem]">
        <SheetHeader className="border-b border-border px-5 py-4 pr-12 text-left">
          <SheetTitle>Passed bills</SheetTitle>
          <SheetDescription>Collected bills for this shift.</SheetDescription>
        </SheetHeader>

        <section className="border-b border-border p-4" aria-label="Current order settlement">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Current order</p>
              <p className="text-xs text-muted-foreground">{linesCount} {linesCount === 1 ? 'item' : 'items'} · {money(total)}</p>
            </div>
            {payment ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500 bg-emerald-50 px-2 py-1 text-xs font-bold uppercase text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 size={13} /> {payment.mode} paid
              </span>
            ) : null}
          </div>

          {linesCount === 0 ? (
            <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">Add items to the order before settlement.</p>
          ) : showPaymentCollector ? (
            <Pos1PaymentCollector
              total={total}
              payment={payment}
              cashReceiptRequest={cashReceiptRequest}
              onRecordPayment={onRecordPayment}
              onClearPayment={onClearPayment}
              onClose={onClosePaymentCollector}
            />
          ) : (
            <button
              type="button"
              onClick={onOpenPaymentCollector}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <ReceiptText size={16} /> Settle current order
              <kbd className="rounded border border-primary-foreground/30 bg-primary-foreground/10 px-1.5 py-0.5 font-mono text-[10px]">F6</kbd>
            </button>
          )}
        </section>

        <section className="min-h-0 flex-1 overflow-y-auto" aria-label="Collected bills">
          {previousBills.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">No bills have been collected yet.</p>
          ) : (
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 border-b border-border bg-card text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="w-8 px-4 py-3 text-center">#</th>
                  <th className="px-2 py-3">Bill no.</th>
                  <th className="px-2 py-3">Table</th>
                  <th className="px-2 py-3">Collected</th>
                  <th className="w-24 px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {previousBills.map((bill, index) => (
                  <tr key={bill.billNo}>
                    <td className="px-4 py-3 text-center font-mono text-muted-foreground">{index + 1}</td>
                    <td className="px-2 py-3 font-semibold text-foreground">{bill.billNo}</td>
                    <td className="px-2 py-3 text-muted-foreground">{bill.tableNo}</td>
                    <td className="px-2 py-3 text-muted-foreground">{bill.collectedAt}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-foreground">{money(bill.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <footer className="flex items-center justify-between border-t border-emerald-500 bg-emerald-50/60 px-5 py-4 dark:bg-emerald-950/20">
          {hasCashPayment ? <span className="rounded-md border-2 border-emerald-600 px-2 py-0.5 text-xs font-black tracking-[0.14em] text-emerald-700 dark:border-emerald-400 dark:text-emerald-300">PAID · CASH</span> : <span />}
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total</span>
            <span className="text-2xl font-black tracking-tight text-blue-600 dark:text-blue-400">{money(collectedTotal)}</span>
          </div>
        </footer>
      </SheetContent>
    </Sheet>
  );
}

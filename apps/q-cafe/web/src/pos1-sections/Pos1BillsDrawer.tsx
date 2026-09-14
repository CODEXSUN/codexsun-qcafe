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
import type { PaymentRecord } from './types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linesCount: number;
  total: number;
  payment?: PaymentRecord | null;
  showPaymentCollector: boolean;
  onOpenPaymentCollector: () => void;
  onClosePaymentCollector: () => void;
  onRecordPayment: (payment: PaymentRecord) => void;
  onClearPayment: () => void;
  onSkipPayment: () => void;
};

export function Pos1BillsDrawer({
  open,
  onOpenChange,
  linesCount,
  total,
  payment,
  showPaymentCollector,
  onOpenPaymentCollector,
  onClosePaymentCollector,
  onRecordPayment,
  onClearPayment,
  onSkipPayment,
}: Props) {
  function closeDrawer() {
    onClosePaymentCollector();
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : closeDrawer())}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[30rem]">
        <SheetHeader className="border-b border-border px-5 py-4 pr-12 text-left">
          <SheetTitle>Receipt</SheetTitle>
          <SheetDescription>Collect or skip payment for the current bill.</SheetDescription>
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
            <div className="space-y-3">
              <Pos1PaymentCollector
                total={total}
                payment={payment}
                onRecordPayment={onRecordPayment}
                onClearPayment={onClearPayment}
                onClose={onClosePaymentCollector}
              />
              {!payment && (
                <button
                  type="button"
                  onClick={onSkipPayment}
                  className="w-full cursor-pointer rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Skip payment and save as unpaid
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onSkipPayment}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Skip payment
              </button>
              <button
                type="button"
                onClick={onOpenPaymentCollector}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <ReceiptText size={16} /> Collect payment
              </button>
            </div>
          )}
        </section>

      </SheetContent>
    </Sheet>
  );
}

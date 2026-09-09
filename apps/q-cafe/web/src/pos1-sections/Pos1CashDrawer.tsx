import { Banknote } from 'lucide-react';
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
  cashReceiptRequest: number;
  onRecordPayment: (payment: PaymentRecord) => void;
  onClearPayment: () => void;
};

export function Pos1CashDrawer({
  open,
  onOpenChange,
  linesCount,
  total,
  payment,
  cashReceiptRequest,
  onRecordPayment,
  onClearPayment,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-[30rem]">
        <SheetHeader className="border-b border-border px-5 py-4 pr-12 text-left">
          <SheetTitle className="flex items-center gap-2"><Banknote size={18} /> Cash receipt</SheetTitle>
          <SheetDescription>Settle the current order with cash.</SheetDescription>
        </SheetHeader>

        <section className="p-5" aria-label="Cash settlement">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Current order</p>
              <p className="text-xs text-muted-foreground">{linesCount} {linesCount === 1 ? 'item' : 'items'}</p>
            </div>
            <span className="text-lg font-black text-foreground">{money(total)}</span>
          </div>

          {linesCount === 0 ? (
            <p className="rounded-xl bg-muted px-3 py-3 text-sm text-muted-foreground">Add items to the order before recording cash.</p>
          ) : (
            <Pos1PaymentCollector
              total={total}
              payment={payment}
              cashReceiptRequest={cashReceiptRequest}
              onRecordPayment={onRecordPayment}
              onClearPayment={onClearPayment}
              onClose={() => onOpenChange(false)}
            />
          )}
        </section>
      </SheetContent>
    </Sheet>
  );
}

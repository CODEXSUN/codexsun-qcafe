import { ChevronDown, ChevronUp, ReceiptText } from 'lucide-react';
import { money, type PosBill, type PosItem } from '../api';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@codexsun/ui/components/ui/sheet';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bills: PosBill[];
  items: PosItem[];
  selectedBillId: number | null;
  onSelectBill: (billId: number) => void;
  onMoveBill: (direction: 1 | -1) => void;
};

function receiptStatus(bill: PosBill) {
  if (bill.status === 'paid') return 'Paid';
  if (bill.status === 'part-paid') return 'Part paid';
  if (bill.status === 'void') return 'Void';
  return 'Unpaid';
}

function receiptStatusClass(bill: PosBill) {
  if (bill.status === 'paid') return 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
  if (bill.status === 'part-paid') return 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
  if (bill.status === 'void') return 'border-destructive/40 bg-destructive/10 text-destructive';
  return 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
}

export function Pos1PreviousBillsDrawer({
  open,
  onOpenChange,
  bills,
  items,
  selectedBillId,
  onSelectBill,
  onMoveBill,
}: Props) {
  const previousBills = bills.slice().sort((left, right) => right.id - left.id);
  const selectedBill = previousBills.find((bill) => bill.id === selectedBillId) ?? previousBills[0];
  const selectedItems = selectedBill
    ? items.filter((item) => item.pos_id === selectedBill.id)
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[30rem]">
        <SheetHeader className="border-b border-border px-5 py-4 pr-12 text-left">
          <SheetTitle>Previous bills</SheetTitle>
          <SheetDescription>Review passed bills. Use Page Up and Page Down to move between bills.</SheetDescription>
        </SheetHeader>

        {selectedBill ? (
          <section className="border-b border-border bg-muted/30 p-4" aria-label="Selected previous bill">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Bill {selectedBill.bill_no}</p>
                <p className="mt-1 text-xs text-muted-foreground">{selectedBill.table_no} · {new Date(selectedBill.created_at).toLocaleString()}</p>
              </div>
              <span className={`rounded-md border px-2 py-1 text-xs font-bold uppercase ${receiptStatusClass(selectedBill)}`}>
                {receiptStatus(selectedBill)}
              </span>
            </div>
            <div className="mt-4 overflow-hidden rounded-lg border border-border bg-background">
              <div className="grid grid-cols-[minmax(0,1fr)_2.25rem_5rem] border-b border-border bg-muted/50 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                <span>Item</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Amount</span>
              </div>
              {selectedItems.map((item) => (
                <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_2.25rem_5rem] gap-2 border-b border-border px-3 py-2 text-xs last:border-b-0">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-foreground">{item.item_name}</span>
                    <span className="block text-[11px] text-muted-foreground">{money(item.rate)}</span>
                  </span>
                  <span className="text-center font-medium text-foreground">{item.quantity}</span>
                  <span className="text-right font-semibold text-foreground">{money(item.amount)}</span>
                </div>
              ))}
              {selectedItems.length === 0 && (
                <p className="px-3 py-3 text-xs text-muted-foreground">Item details are not available for this bill.</p>
              )}
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Grand total</span>
              <span className="text-2xl font-black tracking-tight text-foreground">{money(selectedBill.grand_total)}</span>
            </div>
          </section>
        ) : (
          <section className="border-b border-border p-4 text-sm text-muted-foreground">No previous bills are available.</section>
        )}

        <div className="mt-[50px] flex items-center justify-between border-y border-border bg-muted/20 px-4 py-3">
          <p className="text-xs font-semibold text-muted-foreground">Previous bill list · {previousBills.length} {previousBills.length === 1 ? 'bill' : 'bills'}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => onMoveBill(-1)} disabled={!selectedBill || selectedBill.id === previousBills[0]?.id} className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40">
              <ChevronUp size={14} /> PgUp
            </button>
            <button type="button" onClick={() => onMoveBill(1)} disabled={!selectedBill || selectedBill.id === previousBills[previousBills.length - 1]?.id} className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40">
              <ChevronDown size={14} /> PgDn
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto" aria-label="Previous bill list">
          {previousBills.map((bill) => {
            const selected = bill.id === selectedBill?.id;
            return (
              <button
                key={bill.id}
                type="button"
                onClick={() => onSelectBill(bill.id)}
                className={`flex w-full cursor-pointer items-center justify-between gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground ${selected ? 'bg-accent' : 'bg-background'}`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">Bill {bill.bill_no}</span>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">{bill.table_no} · {new Date(bill.created_at).toLocaleString()}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{money(bill.grand_total)}</span>
                  <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase ${receiptStatusClass(bill)}`}>{receiptStatus(bill)}</span>
                </span>
              </button>
            );
          })}
          {previousBills.length === 0 && (
            <div className="grid min-h-48 place-items-center p-6 text-center text-sm text-muted-foreground">
              <span><ReceiptText className="mx-auto mb-2 size-5" />No previous bills yet.</span>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

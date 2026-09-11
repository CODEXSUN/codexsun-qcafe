import { type CafeSettings } from './Settings';
import type { PaymentRecord } from './pos1-sections/types';
import type { PosBill, PosItem, ReceiptTransaction } from './api';

type EntryLine = {
  key: string;
  menuId?: number;
  code: string;
  name: string;
  quantity: number;
  price: number;
  chair?: number | string;
};

type OrderTab = {
  id: string;
  name: string;
  tableName: string;
  chair: string;
  lines: EntryLine[];
};

type ThermalBillReceiptProps = {
  settings: CafeSettings;
  tab?: OrderTab;
  tableName?: string;
  lines?: EntryLine[];
  subtotal?: number;
  totalQuantity?: number;
  gstApplied?: boolean;
  gstAmount?: number;
  total?: number;
  className?: string;
  billNumber?: string;
  payment?: PaymentRecord | null;
  bill?: PosBill;
  items?: PosItem[];
  transactions?: ReceiptTransaction[];
};


export function ThermalBillReceipt({
  settings,
  tab,
  tableName: explicitTableName,
  lines: explicitLines,
  subtotal: explicitSubtotal,
  totalQuantity: explicitTotalQuantity,
  gstApplied: explicitGstApplied,
  gstAmount: explicitGstAmount,
  total: explicitTotal,
  className = '',
  billNumber,
  payment: explicitPayment,
  bill,
  items,
  transactions,
}: ThermalBillReceiptProps) {
  const resolvedTableName = explicitTableName ?? bill?.table_no ?? tab?.tableName ?? 'T01';
  const resolvedLines: EntryLine[] =
    explicitLines ??
    (items && items.length > 0
      ? items.map((it) => ({
          key: String(it.id),
          menuId: it.menu_id ?? undefined,
          code: it.item_code,
          name: it.item_name,
          quantity: it.quantity,
          price: it.rate,
        }))
      : tab?.lines ?? []);

  const resolvedSubtotal = explicitSubtotal ?? bill?.taxable_amount ?? resolvedLines.reduce((s, l) => s + l.price * l.quantity, 0);
  const resolvedTotalQuantity = explicitTotalQuantity ?? resolvedLines.reduce((s, l) => s + l.quantity, 0);
  const resolvedGstApplied = explicitGstApplied ?? (bill ? bill.gst_percent > 0 : false);
  const resolvedGstAmount = explicitGstAmount ?? bill?.gst_amount ?? 0;
  const resolvedTotal = explicitTotal ?? bill?.grand_total ?? (resolvedSubtotal + resolvedGstAmount);

  const resolvedPayment: PaymentRecord | null =
    explicitPayment ??
    (transactions && transactions.length > 0
      ? {
          mode: (transactions[0]!.transaction_mode === 'bank' || transactions[0]!.transaction_mode === 'other') ? 'card' : transactions[0]!.transaction_mode,
          amount: transactions[0]!.amount,
          referenceNo: transactions[0]!.reference_no ?? '-',
          timestamp: new Date(transactions[0]!.created_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }),
        }
      : null);
  const billDate = bill?.created_at
    ? (isNaN(new Date(bill.created_at.replace(' ', 'T')).getTime()) ? new Date() : new Date(bill.created_at.replace(' ', 'T')))
    : new Date();

  const dateStr = billDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = billDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const generatedBillNo = billNumber ?? bill?.bill_no ?? '1';

  const isTakeaway = resolvedTableName.toLowerCase().includes('takeaway') || resolvedTableName.toLowerCase().includes('parcel');
  const serviceType = isTakeaway ? 'TAKEAWAY / PARCEL' : 'DINE-IN';

  const cgst = resolvedGstApplied ? Math.round(resolvedGstAmount / 2) : 0;
  const sgst = resolvedGstApplied ? resolvedGstAmount - cgst : 0;
  const restaurantName = settings.restaurantName.trim();
  const receiptHeader = settings.receiptHeader.trim();
  const receiptLegalNote = settings.receiptLegalNote.trim();
  const address = settings.address?.trim();
  const contactNumber = settings.contactNumber.trim();
  const gstin = settings.gstin.trim();
  const fssai = settings.fssai?.trim();

  return (
    <div
      className={`thermal-receipt font-mono text-black leading-tight select-none ${className}`}
      style={{
        width: '70mm',
        maxWidth: '70mm',
        margin: '0 auto',
        padding: '2mm 1mm',
        backgroundColor: '#ffffff',
        color: '#000000',
        fontSize: '11.5px',
        boxSizing: 'border-box',
      }}
    >
      {/* Hotel / Restaurant Header */}
      <div className="text-center space-y-0.5 pb-1">
        {restaurantName ? <h1 className="text-[18px] font-black uppercase tracking-wider leading-none text-black">{restaurantName}</h1> : null}
        {receiptHeader ? <p className="text-[10.5px] font-semibold uppercase tracking-wide text-black">{receiptHeader}</p> : null}
        {address ? <p className="text-[10px] text-black leading-tight">{address}</p> : null}
        {contactNumber ? <p className="text-[10px] font-semibold text-black leading-tight">{contactNumber}</p> : null}
        {(resolvedGstApplied && gstin) || fssai ? (
          <div className="pt-0.5 space-y-0.5 text-[10px] font-semibold text-black">
            {resolvedGstApplied && gstin ? <p>GSTIN: {gstin}</p> : null}
            {fssai ? <p className="font-normal text-[9.5px]">FSSAI Lic: {fssai}</p> : null}
          </div>
        ) : null}
      </div>

      {/* Bill Type Header */}
      <div className="py-1 my-1 text-center font-bold text-[11px] uppercase tracking-wider text-black">
        {resolvedGstApplied ? 'TAX INVOICE' : 'RESTAURANT BILL'}
      </div>

      {/* Order Meta Info */}
      <div className="grid grid-cols-2 text-[10px] gap-x-2 gap-y-0.5 py-0.5 text-black">
        <div>
          <span className="font-bold">Bill No:</span> {generatedBillNo}
        </div>
        <div className="text-right">
          <span className="font-bold">Date:</span> {dateStr}
        </div>
        <div>
          <span className="font-bold">Type:</span> {serviceType}
        </div>
        <div className="text-right">
          <span className="font-bold">Time:</span> {timeStr}
        </div>
      </div>

      {/* Items Table Header */}
      <div className="my-1 border-y border-black py-1 text-[10.5px] font-bold uppercase text-black">
        <div className="flex items-center">
          <span className="flex-1">Item Description</span>
          <span className="w-8 text-right">Qty</span>
          <span className="w-13 text-right">Rate</span>
          <span className="w-15 text-right">Amount</span>
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-0.5 py-0.5">
        {resolvedLines.map((line) => (
          <div key={line.key} className="py-1 text-[11px] text-black">
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-1 font-semibold leading-tight">
                <span>{line.name}</span>
              </div>
              <div className="w-8 text-right font-mono font-medium">{line.quantity}</div>
              <div className="w-13 text-right font-mono font-medium">{(line.price / 100).toFixed(2)}</div>
              <div className="w-15 text-right font-mono font-bold">
                {((line.price * line.quantity) / 100).toFixed(2)}
              </div>
            </div>
          </div>
        ))}
        {resolvedLines.length === 0 && (
          <div className="py-3 text-center text-[10.5px] italic text-black">No items in bill</div>
        )}
      </div>

      <div className="ml-auto w-1/2 border-t border-black" aria-hidden="true" />

      {/* Summary Counts */}
      <div className="pt-1 mt-1 text-[10px] flex justify-between text-black font-semibold">
        <span>Total Items: {resolvedLines.length}</span>
        <span>Total Qty: {resolvedTotalQuantity}</span>
      </div>

      {/* Financial Breakdown */}
      <div className="pt-1 mt-1 space-y-0.5 text-[10.5px] text-black">
        <div className="flex justify-between">
          <span>Sub Total:</span>
          <span className="font-mono">₹{(resolvedSubtotal / 100).toFixed(2)}</span>
        </div>

        {resolvedGstApplied && (
          <>
            <div className="flex justify-between text-[10px]">
              <span>CGST @ 2.5%:</span>
              <span className="font-mono">₹{(cgst / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span>SGST @ 2.5%:</span>
              <span className="font-mono">₹{(sgst / 100).toFixed(2)}</span>
            </div>
          </>
        )}

        {/* Grand Total Net Payable */}
        <div className="border-t-2 border-b-2 border-black border-double py-1 my-1 flex items-baseline justify-between font-bold text-black">
          <span className="text-[12px] uppercase">NET PAYABLE:</span>
          <span className="text-[14px] font-mono">₹{(resolvedTotal / 100).toFixed(2)}</span>
        </div>
      </div>

      {/* Bill Footer & Payment Info */}
      <div className="text-center pt-1.5 space-y-1 text-black">
        {resolvedPayment ? (
          <div className="border border-dashed border-black py-1 px-1.5 text-left text-[10px] space-y-0.5 my-1">
            <div className="flex justify-between font-bold">
              <span>SETTLED VIA:</span>
              <span className="uppercase">{resolvedPayment.mode}</span>
            </div>
            {resolvedPayment.mode === 'cash' ? (
              <>
                <div className="flex justify-between">
                  <span>Cash Tendered:</span>
                  <span>₹{((resolvedPayment.tendered ?? resolvedPayment.amount) / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Change Return:</span>
                  <span>₹{((resolvedPayment.balance ?? 0) / 100).toFixed(2)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span>POS Terminal:</span>
                  <span>{resolvedPayment.machineNo || 'POS Machine'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ref / Auth:</span>
                  <span className="font-mono">{resolvedPayment.referenceNo || '-'}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-[9px] text-black/70 pt-0.5 border-t border-dotted border-black/50">
              <span>Time:</span>
              <span>{resolvedPayment.timestamp}</span>
            </div>
          </div>
        ) : null}
        <p className="whitespace-pre-line text-[10px] font-bold text-black leading-tight pt-0.5">
          {settings.receiptFooter || 'Thank you for dining with us! Please visit again.'}
        </p>
        {receiptLegalNote ? <p className="text-[9px] text-black/80">{receiptLegalNote}</p> : null}
      </div>
    </div>
  );
}

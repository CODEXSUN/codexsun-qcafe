import { type CafeSettings } from './Settings';

type EntryLine = {
  key: string;
  menuId?: number;
  code: string;
  name: string;
  quantity: number;
  price: number;
  chair?: number;
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
  tab: OrderTab;
  tableName: string;
  lines: EntryLine[];
  subtotal: number;
  totalQuantity: number;
  gstApplied: boolean;
  gstAmount: number;
  total: number;
  className?: string;
  billNumber?: string;
};

function formatChair(table: string, chair: number | string) {
  const match = table.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    return `${num}.${chair}`;
  }
  return `P.${chair}`;
}

export function ThermalBillReceipt({
  settings,
  tab,
  tableName,
  lines,
  subtotal,
  totalQuantity,
  gstApplied,
  gstAmount,
  total,
  className = '',
  billNumber,
}: ThermalBillReceiptProps) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const generatedBillNo =
    billNumber ??
    `QC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
      now.getDate()
    ).padStart(2, '0')}-${tab.id.replace(/\D/g, '') || '01'}`;

  const isTakeaway = tableName.toLowerCase().includes('takeaway') || tableName.toLowerCase().includes('parcel');
  const serviceType = isTakeaway ? 'TAKEAWAY / PARCEL' : 'DINE-IN';

  const cgst = gstApplied ? Math.round(gstAmount / 2) : 0;
  const sgst = gstApplied ? gstAmount - cgst : 0;

  return (
    <div
      className={`thermal-receipt font-mono text-black leading-tight select-none ${className}`}
      style={{
        width: '72mm',
        maxWidth: '72mm',
        margin: '0 auto',
        padding: '3mm 2mm',
        backgroundColor: '#ffffff',
        color: '#000000',
        fontSize: '11px',
        boxSizing: 'border-box',
      }}
    >
      {/* Hotel / Restaurant Header */}
      <div className="text-center space-y-0.5 pb-1">
        <h1 className="text-[17px] font-black uppercase tracking-wider leading-none text-black">
          {settings.restaurantName || 'Q CAFE'}
        </h1>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-black">
          {settings.receiptHeader || 'Artisanal Coffee & Kitchen'}
        </p>
        <p className="text-[9px] text-black leading-tight">
          {settings.address || '12/4 North Boulevard, Anna Nagar, Chennai - 600040'}
        </p>
        <p className="text-[9px] text-black">
          Ph: {settings.contactNumber || '+91 98765 43210'} | {settings.branchName || 'Main Floor'}
        </p>
        <div className="pt-0.5 space-y-0.5 text-[9px] font-semibold text-black">
          <p>GSTIN: {settings.gstin || '33AAAAA0000A1Z5'}</p>
          <p className="font-normal text-[8.5px]">FSSAI Lic: {settings.fssai || '12423001000456'}</p>
        </div>
      </div>

      {/* Bill Type Header */}
      <div className="border-t border-b border-dashed border-black py-1 my-1 text-center font-bold text-[11px] uppercase tracking-wider text-black">
        {gstApplied ? 'TAX INVOICE' : 'RESTAURANT BILL'}
      </div>

      {/* Order Meta Info */}
      <div className="grid grid-cols-2 text-[9.5px] gap-x-2 gap-y-0.5 py-0.5 text-black">
        <div>
          <span className="font-bold">Bill No:</span> {generatedBillNo}
        </div>
        <div className="text-right">
          <span className="font-bold">Date:</span> {dateStr}
        </div>
        <div>
          <span className="font-bold">Table:</span> {isTakeaway ? 'PARCEL' : tableName}
        </div>
        <div className="text-right">
          <span className="font-bold">Time:</span> {timeStr}
        </div>
        <div>
          <span className="font-bold">Type:</span> {serviceType}
        </div>
        <div className="text-right">
          <span className="font-bold">Tab:</span> {tab.name}
        </div>
      </div>

      {/* Items Table Header */}
      <div className="border-t border-b border-dashed border-black py-1 my-1 text-[10px] font-bold uppercase text-black">
        <div className="flex items-center">
          <span className="flex-1">Item Description</span>
          <span className="w-8 text-right">Qty</span>
          <span className="w-13 text-right">Rate</span>
          <span className="w-15 text-right">Amount</span>
        </div>
      </div>

      {/* Items List */}
      <div className="divide-y divide-dashed divide-black/30 py-0.5">
        {lines.map((line, idx) => (
          <div key={line.key} className="py-1 text-[10.5px] text-black">
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-1 font-semibold leading-tight">
                <span>{line.name}</span>
                {!isTakeaway && (
                  <span className="block text-[8.5px] font-normal text-black/85">
                    Seat: {formatChair(tableName, line.chair ?? (idx + 1))} ({line.code})
                  </span>
                )}
              </div>
              <div className="w-8 text-right font-mono font-medium">{line.quantity}</div>
              <div className="w-13 text-right font-mono font-medium">{(line.price / 100).toFixed(2)}</div>
              <div className="w-15 text-right font-mono font-bold">
                {((line.price * line.quantity) / 100).toFixed(2)}
              </div>
            </div>
          </div>
        ))}
        {lines.length === 0 && (
          <div className="py-3 text-center text-[10px] italic text-black">No items in bill</div>
        )}
      </div>

      {/* Summary Counts */}
      <div className="border-t border-dashed border-black pt-1 mt-1 text-[9.5px] flex justify-between text-black font-semibold">
        <span>Total Items: {lines.length}</span>
        <span>Total Qty: {totalQuantity}</span>
      </div>

      {/* Financial Breakdown */}
      <div className="border-t border-dashed border-black pt-1 mt-1 space-y-0.5 text-[10px] text-black">
        <div className="flex justify-between">
          <span>Sub Total:</span>
          <span className="font-mono">₹{(subtotal / 100).toFixed(2)}</span>
        </div>

        {gstApplied && (
          <>
            <div className="flex justify-between text-[9.5px]">
              <span>CGST @ 2.5%:</span>
              <span className="font-mono">₹{(cgst / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[9.5px]">
              <span>SGST @ 2.5%:</span>
              <span className="font-mono">₹{(sgst / 100).toFixed(2)}</span>
            </div>
          </>
        )}

        {/* Grand Total Net Payable */}
        <div className="border-t-2 border-b-2 border-black border-double py-1 my-1 flex items-baseline justify-between font-bold text-black">
          <span className="text-[12px] uppercase">NET PAYABLE:</span>
          <span className="text-[14px] font-mono">₹{(total / 100).toFixed(2)}</span>
        </div>
      </div>

      {/* Bill Footer & Greetings */}
      <div className="text-center pt-1.5 space-y-1 text-black">
        <p className="text-[8.5px] uppercase font-semibold text-black">
          Mode: Cash / UPI (Bill Generated)
        </p>
        <p className="text-[9.5px] font-bold text-black leading-tight pt-0.5">
          {settings.receiptFooter || 'Thank you for dining with us! Please visit again.'}
        </p>
        <p className="text-[8px] text-black/80">
          GST included where applicable • Goods once sold cannot be returned
        </p>
        <div className="text-[9px] font-mono tracking-widest pt-2 text-black">
          - - - - - - - - - - - - - - - - - - - - - - - -
        </div>
        <div className="text-[8px] uppercase font-mono tracking-widest text-black pb-1">
          [ TEAR HERE / THANK YOU ]
        </div>
      </div>
    </div>
  );
}

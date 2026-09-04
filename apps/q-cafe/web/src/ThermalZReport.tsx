import { type CafeSettings } from './Settings';

export interface ThermalZReportProps {
  settings: CafeSettings;
  dateStr: string;
  billCount: number;
  grossTotal: number; // in paise
  taxableTotal: number; // in paise
  gstTotal: number; // in paise
  cashTotal: number; // in paise
  cashBillsCount: number;
  upiTotal: number; // in paise
  upiBillsCount: number;
  cardTotal: number; // in paise
  cardBillsCount: number;
  denominations: Record<number, number>;
  coins: number; // in paise
  cashCounted: number; // in paise
  variance: number; // in paise
  cashierName?: string;
  notes?: string;
  className?: string;
}

export function ThermalZReport({
  settings,
  dateStr,
  billCount,
  grossTotal,
  taxableTotal,
  gstTotal,
  cashTotal,
  cashBillsCount,
  upiTotal,
  upiBillsCount,
  cardTotal,
  cardBillsCount,
  denominations,
  coins,
  cashCounted,
  variance,
  cashierName = 'Cashier 01',
  notes = '',
  className = '',
}: ThermalZReportProps) {
  const now = new Date();
  const printTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const cgst = Math.round(gstTotal / 2);
  const sgst = gstTotal - cgst;

  const noteList = [500, 200, 100, 50, 20, 10];

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
        </div>
      </div>

      {/* Report Title */}
      <div className="border-t-2 border-b-2 border-double border-black py-1 my-1 text-center font-black text-[12px] uppercase tracking-wider text-black">
        DAILY SETTLEMENT (Z-REPORT)
      </div>

      {/* Meta Info */}
      <div className="grid grid-cols-2 text-[9.5px] gap-x-2 gap-y-0.5 py-0.5 text-black">
        <div>
          <span className="font-bold">Date:</span> {dateStr}
        </div>
        <div className="text-right">
          <span className="font-bold">Printed:</span> {printTime}
        </div>
        <div>
          <span className="font-bold">Station:</span> POS-01
        </div>
        <div className="text-right">
          <span className="font-bold">Cashier:</span> {cashierName}
        </div>
      </div>

      {/* Section 1: Financial Sales Summary */}
      <div className="border-t border-b border-dashed border-black py-1 my-1 text-[10px] font-bold uppercase text-black">
        SALES & REVENUE SUMMARY
      </div>
      <div className="space-y-0.5 text-[10px] text-black py-0.5">
        <div className="flex justify-between">
          <span>Total Invoices / Bills:</span>
          <span className="font-mono font-bold">{billCount}</span>
        </div>
        <div className="flex justify-between">
          <span>Taxable Net Sales:</span>
          <span className="font-mono">₹{(taxableTotal / 100).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-[9.5px]">
          <span>CGST (2.5%):</span>
          <span className="font-mono">₹{(cgst / 100).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-[9.5px]">
          <span>SGST (2.5%):</span>
          <span className="font-mono">₹{(sgst / 100).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-[9.5px]">
          <span>Total GST Tax:</span>
          <span className="font-mono">₹{(gstTotal / 100).toFixed(2)}</span>
        </div>
        <div className="border-t border-dashed border-black pt-1 mt-1 flex justify-between font-black text-[11.5px]">
          <span>GROSS REVENUE:</span>
          <span className="font-mono">₹{(grossTotal / 100).toFixed(2)}</span>
        </div>
      </div>

      {/* Section 2: Payment Tender Breakdown */}
      <div className="border-t border-b border-dashed border-black py-1 my-1 text-[10px] font-bold uppercase text-black">
        PAYMENT MODE RECONCILIATION
      </div>
      <div className="space-y-0.5 text-[10px] text-black py-0.5">
        <div className="flex justify-between">
          <span>CASH ({cashBillsCount} txns):</span>
          <span className="font-mono font-semibold">₹{(cashTotal / 100).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>UPI / QR ({upiBillsCount} txns):</span>
          <span className="font-mono font-semibold">₹{(upiTotal / 100).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>CARD / POS ({cardBillsCount} txns):</span>
          <span className="font-mono font-semibold">₹{(cardTotal / 100).toFixed(2)}</span>
        </div>
        <div className="border-t border-dotted border-black/60 pt-0.5 flex justify-between text-[9.5px] font-bold">
          <span>Total Collected:</span>
          <span className="font-mono">₹{((cashTotal + upiTotal + cardTotal) / 100).toFixed(2)}</span>
        </div>
      </div>

      {/* Section 3: Cash Drawer & Denominations Reconciliation */}
      <div className="border-t border-b border-dashed border-black py-1 my-1 text-[10px] font-bold uppercase text-black">
        CASH DRAWER RECONCILIATION
      </div>
      <div className="space-y-0.5 text-[9.5px] text-black py-0.5">
        <div className="flex justify-between">
          <span>Expected Cash (POS):</span>
          <span className="font-mono font-bold">₹{(cashTotal / 100).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Counted Physical Cash:</span>
          <span className="font-mono font-bold">₹{(cashCounted / 100).toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-black text-[10px] pt-0.5 border-t border-dotted border-black/50">
          <span>Variance (Diff):</span>
          <span className="font-mono">
            {variance === 0
              ? '₹0.00 (Balanced)'
              : variance > 0
              ? `+₹${(variance / 100).toFixed(2)} (Excess)`
              : `-₹${(Math.abs(variance) / 100).toFixed(2)} (Short)`}
          </span>
        </div>
      </div>

      {/* Denominations Table */}
      <div className="border-t border-dashed border-black/60 pt-1 mt-1">
        <div className="text-[9px] font-bold uppercase pb-0.5">Note Count Breakdown:</div>
        <div className="grid grid-cols-2 gap-x-2 text-[9px]">
          {noteList.map((val) => {
            const count = denominations[val] || 0;
            const amt = val * count * 100;
            return (
              <div key={val} className="flex justify-between py-0.2">
                <span>₹{val} x {count}</span>
                <span className="font-mono">₹{(amt / 100).toFixed(2)}</span>
              </div>
            );
          })}
        </div>
        {coins > 0 && (
          <div className="flex justify-between text-[9px] pt-0.5">
            <span>Coins & Small Change:</span>
            <span className="font-mono">₹{(coins / 100).toFixed(2)}</span>
          </div>
        )}
      </div>

      {notes && (
        <div className="border-t border-dashed border-black pt-1 mt-1 text-[9px]">
          <span className="font-bold">Shift Notes: </span>
          <span>{notes}</span>
        </div>
      )}

      {/* Signatures & Footer */}
      <div className="border-t border-dashed border-black pt-3 mt-3 text-[9px] space-y-3 text-black">
        <div className="flex justify-between">
          <span>Cashier: __________________</span>
          <span>Manager: __________________</span>
        </div>
        <div className="text-center space-y-0.5 pt-1">
          <p className="font-black tracking-widest text-[9.5px]">*** END OF DAY SETTLED ***</p>
          <p className="text-[8px] text-black/70">Register successfully closed & reconciled.</p>
        </div>
        <div className="text-[8px] uppercase font-mono tracking-widest text-center text-black pb-1">
          - - - - - - - - - - - - - - - - - - - - -
        </div>
      </div>
    </div>
  );
}

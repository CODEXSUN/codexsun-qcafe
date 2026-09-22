import type { CafeSettings } from './Settings';

export type PrintableLine = {
  name: string;
  quantity: number;
  price: number;
};

type RawReceiptInput = {
  settings: CafeSettings;
  billNumber: string;
  tableName: string;
  lines: PrintableLine[];
  subtotal: number;
  gstAmount: number;
  total: number;
  paymentMode: string;
};

type DirectPrintResponse = {
  queued: boolean;
  jobId?: number;
  printer: string;
  message: string;
};

const WIDTH = 42;

function plainText(value: string) {
  return value.replace(/[^\x20-\x7E]/g, ' ');
}

function centered(value: string) {
  const text = plainText(value).slice(0, WIDTH);
  const padding = Math.max(0, Math.floor((WIDTH - text.length) / 2));
  return `${' '.repeat(padding)}${text}`;
}

function money(value: number) {
  return `Rs.${(value / 100).toFixed(2)}`;
}

function itemLine(line: PrintableLine) {
  const name = plainText(line.name).slice(0, 27);
  const amount = money(line.price * line.quantity);
  return `${name}\n${String(line.quantity).padStart(3)} x ${money(line.price).padStart(9)}${amount.padStart(15)}`;
}

type KotPrintInput = {
  settings: CafeSettings;
  kotNumber: string;
  tableName: string;
  lines: PrintableLine[];
};

function printTarget(target: string | undefined) {
  return target && target !== 'system-default' ? target : null;
}

export function formatKotTicket(input: KotPrintInput) {
  const rows = [
    centered(input.settings.restaurantName || 'Q Cafe'),
    centered('KITCHEN ORDER TICKET'),
    '-'.repeat(WIDTH),
    `KOT: ${plainText(input.kotNumber).slice(0, 24)}`,
    `Table: ${plainText(input.tableName).slice(0, 33)}`,
    `Time: ${new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}`,
    '-'.repeat(WIDTH),
    ...input.lines.flatMap((line) => [
      `${String(line.quantity).padStart(3)} x ${plainText(line.name).slice(0, 36)}`,
    ]),
    '-'.repeat(WIDTH),
    `Items: ${input.lines.length}   Quantity: ${input.lines.reduce((total, line) => total + line.quantity, 0)}`,
  ];
  return `${rows.join('\r\n')}\r\n`;
}

async function submitDesktopPrint(printerName: string | null, documentName: string, receipt: string) {
  if (!isDesktopPrinterRuntime()) {
    throw new Error('Direct print is available in the Q Cafe Windows application.');
  }
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<DirectPrintResponse>('qcafe_print_raw_receipt', {
    request: { printerName, documentName, receipt },
  });
}

export async function directPrintKot(input: KotPrintInput) {
  return submitDesktopPrint(
    printTarget(input.settings.kotPrinterTarget),
    `Q Cafe KOT ${input.kotNumber}`,
    formatKotTicket(input),
  );
}

export function isDesktopPrinterRuntime() {
  return '__TAURI_INTERNALS__' in window;
}

export function formatRawReceipt(input: RawReceiptInput) {
  const { settings } = input;
  const isTakeaway = input.tableName.toLowerCase().includes('takeaway') || input.tableName.toLowerCase().includes('parcel');
  const serviceType = isTakeaway ? 'TAKEAWAY / PARCEL' : 'DINE-IN';
  const hasGst = input.gstAmount > 0;
  const gstin = settings.gstin ? settings.gstin.trim() : '';
  const fssai = settings.fssai ? settings.fssai.trim() : '';
  const paymentStatus = input.paymentMode.toUpperCase() === 'UNPAID'
    ? 'Status: UNPAID'
    : `Paid by: ${plainText(input.paymentMode).toUpperCase()}`;

  const rows = [
    centered(settings.restaurantName || 'Q Cafe'),
    settings.receiptHeader ? centered(settings.receiptHeader) : '',
    settings.address ? centered(settings.address) : '',
    hasGst && gstin ? centered(`GSTIN: ${gstin}`) : '',
    fssai ? centered(`FSSAI Lic: ${fssai}`) : '',
    '-'.repeat(WIDTH),
    centered(hasGst ? 'TAX INVOICE' : 'RESTAURANT BILL'),
    '-'.repeat(WIDTH),
    `Bill: ${input.billNumber.padEnd(14)} Date: ${new Date().toLocaleDateString('en-IN')}`,
    `Table: ${plainText(input.tableName).slice(0, 13).padEnd(13)} Time: ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
    `Mode: ${serviceType}`,
    '-'.repeat(WIDTH),
    ...input.lines.map(itemLine),
    '-'.repeat(WIDTH),
    `Subtotal${money(input.subtotal).padStart(WIDTH - 8)}`,
    hasGst ? `CGST${money(Math.round(input.gstAmount / 2)).padStart(WIDTH - 4)}` : '',
    hasGst ? `SGST${money(input.gstAmount - Math.round(input.gstAmount / 2)).padStart(WIDTH - 4)}` : '',
    `TOTAL${money(input.total).padStart(WIDTH - 5)}`,
    paymentStatus,
    '-'.repeat(WIDTH),
    ...settings.receiptFooter.split(/\r?\n/).map((line) => centered(line)),
    settings.receiptLegalNote ? centered(settings.receiptLegalNote) : '',
  ];
  return `${rows.filter((line) => line !== '').join('\r\n')}\r\n`;
}

export async function directPrintReceipt(input: RawReceiptInput) {
  return submitDesktopPrint(
    printTarget(input.settings.billingPrinterTarget ?? input.settings.printerTarget),
    `Q Cafe Bill ${input.billNumber}`,
    formatRawReceipt(input),
  );
}

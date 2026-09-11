export type ReceiptPrintLine = {
  name: string;
  quantity: number;
  rate: number;
  amount: number;
};

type ReceiptPrintInput = {
  billNumber: string;
  restaurantName: string;
  receiptHeader: string;
  address?: string;
  contactNumber?: string;
  tableName: string;
  lines: ReceiptPrintLine[];
  subtotal: number;
  gstAmount: number;
  total: number;
  footer: string;
};

export async function printWithCodexsunServices(input: ReceiptPrintInput) {
  if (!('__TAURI_INTERNALS__' in window)) return false;
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('qcafe_print_receipt', {
    id: `q-cafe-${input.billNumber}-${Date.now()}`,
    title: `Q Cafe bill ${input.billNumber}`,
    content: formatThermalReceipt(input),
    receipt: input,
  });
  return true;
}

export async function configureCodexsunLicense(portalUrl: string, licenseKey: string) {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<{ status: string; installationId: string }>('qcafe_configure_license', { portalUrl, licenseKey });
}

export async function verifyCodexsunLicense() {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<{ status: string; checkedAt?: string; message?: string }>('qcafe_verify_license');
}

export type WindowsPrinter = {
  name: string;
  portName: string;
  driverName: string;
  isDefault: boolean;
  isNetwork: boolean;
  status: 'idle' | 'offline' | 'unknown';
};

export type PrinterProfile = {
  name: string;
  mode: 'gdi' | 'raw-escpos';
  smoke: { status: 'ready' | 'unavailable' | 'unverified'; checkedAt: string | null; message: string | null };
};

export async function getCodexsunPrinters() {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<{ selected: PrinterProfile; printers: WindowsPrinter[] }>('qcafe_list_printers');
}

export async function configureCodexsunPrinter(name: string, mode: PrinterProfile['mode']) {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<PrinterProfile>('qcafe_configure_printer', { name, mode });
}

export async function smokeTestCodexsunPrinter() {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<PrinterProfile>('qcafe_smoke_test_printer');
}

export async function testPrintWithCodexsunServices() {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<{ id: string; status: string }>('qcafe_test_print');
}

function formatThermalReceipt(input: ReceiptPrintInput) {
  const width = 48;
  const title = [input.restaurantName, input.receiptHeader, input.address, input.contactNumber].filter(Boolean).map((value) => center(value!, width));
  const rows = input.lines.flatMap((line) => wrap(line.name, 22).map((part, index) => {
    if (index > 0) return part;
    return `${part.padEnd(22)}${String(line.quantity).padStart(4)}${money(line.rate).padStart(10)}${money(line.amount).padStart(12)}`;
  }));
  const details = [
    ...title,
    '-'.repeat(width),
    center('RESTAURANT BILL', width),
    `Bill No: ${input.billNumber}`,
    `Type: ${input.tableName}`,
    '-'.repeat(width),
    `ITEM DESCRIPTION        QTY      RATE      AMOUNT`,
    '-'.repeat(width),
    ...rows,
    '-'.repeat(width),
    `Sub Total:${money(input.subtotal).padStart(width - 10)}`,
    ...(input.gstAmount > 0 ? [`GST:${money(input.gstAmount).padStart(width - 4)}`] : []),
    '='.repeat(width),
    `NET PAYABLE:${money(input.total).padStart(width - 12)}`,
    '='.repeat(width),
    ...input.footer.split(/\r?\n/u).map((line) => center(line, width)),
    '',
    '',
    '',
  ];
  return details.join('\n');
}

function money(value: number) {
  return `₹${(value / 100).toFixed(2)}`;
}

function center(value: string, width: number) {
  const trimmed = value.trim().slice(0, width);
  const left = Math.max(0, Math.floor((width - trimmed.length) / 2));
  return `${' '.repeat(left)}${trimmed}`;
}

function wrap(value: string, width: number) {
  const words = value.trim().split(/\s+/u);
  const rows: string[] = [];
  let row = '';
  for (const word of words) {
    const next = row ? `${row} ${word}` : word;
    if (next.length > width && row) {
      rows.push(row);
      row = word;
    } else {
      row = next;
    }
  }
  return rows.length || row ? [...rows, row] : [''];
}

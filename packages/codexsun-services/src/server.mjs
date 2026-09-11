import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';

const port = Number(process.env.CODEXSUN_SERVICES_PORT ?? 4181);
const token = process.env.CODEXSUN_SERVICES_TOKEN;
const dataDirectory = process.env.CODEXSUN_SERVICES_DATA_DIR;

if (!token || !dataDirectory) throw new Error('CODEXSUN Services requires a token and data directory.');

mkdirSync(dataDirectory, { recursive: true });
const settingsPath = join(dataDirectory, 'agent.json');
const jobsPath = join(dataDirectory, 'print-jobs.json');
let settings = loadSettings();
let queue = loadJson(jobsPath, []);
let printing = false;

const server = createServer(async (request, response) => {
  const send = (status, value) => {
    response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify(value));
  };
  if (request.method === 'GET' && request.url === '/health') return send(200, status());
  if (request.method !== 'POST' || !isAuthorized(request)) return send(401, { error: 'CODEXSUN Services authorization is required.' });
  try {
    const input = await readBody(request);
    if (request.url === '/v1/print-jobs') return send(202, enqueuePrint(input));
    if (request.url === '/v1/printers/list') return send(200, await printerInventory());
    if (request.url === '/v1/printers/configure') return send(200, await configurePrinter(input));
    if (request.url === '/v1/printers/smoke') return send(200, await smokeTestPrinter());
    if (request.url === '/v1/printers/test-print') return send(202, queuePrinterTest());
    if (request.url === '/v1/license/configure') return send(200, configureLicense(input));
    if (request.url === '/v1/license/verify') return send(200, await verifyLicense());
    if (request.url === '/internal/shutdown') {
      send(200, { status: 'stopping' });
      return setTimeout(() => server.close(() => process.exit(0)), 0);
    }
    return send(404, { error: 'Services route not found.' });
  } catch (error) {
    return send(400, { error: error instanceof Error ? error.message : 'Services request failed.' });
  }
});

server.listen(port, '127.0.0.1');
setInterval(() => void verifyLicense().catch(() => undefined), 12 * 60 * 60 * 1000).unref();
void processQueue();
void smokeTestPrinter().catch(() => undefined);

function status() {
  return {
    name: 'CODEXSUN Services',
    status: 'ok',
    queuedJobs: queue.filter((job) => job.status === 'queued').length,
    printer: settings.printer,
    license: settings.license.status,
  };
}

function enqueuePrint(input) {
  const content = requireText(input.content, 'Receipt content', 24_000);
  const job = {
    id: typeof input.id === 'string' && input.id ? input.id : randomUUID(),
    title: typeof input.title === 'string' && input.title ? input.title.slice(0, 120) : 'CODEXSUN receipt',
    content,
    receipt: input.receipt && typeof input.receipt === 'object' ? input.receipt : null,
    createdAt: new Date().toISOString(),
    status: 'queued',
  };
  if (!queue.some((existing) => existing.id === job.id)) {
    queue.push(job);
    saveJson(jobsPath, queue);
    void processQueue();
  }
  return { id: job.id, status: 'queued' };
}

async function processQueue() {
  if (printing) return;
  printing = true;
  try {
    while (true) {
      const job = queue.find((entry) => entry.status === 'queued');
      if (!job) return;
      job.status = 'printing';
      saveJson(jobsPath, queue);
      try {
        await printDefaultWindowsPrinter(job);
        job.status = 'printed';
        job.printedAt = new Date().toISOString();
      } catch (error) {
        job.status = 'failed';
        job.error = error instanceof Error ? error.message : 'Windows could not print this receipt.';
      }
      saveJson(jobsPath, queue);
    }
  } finally {
    printing = false;
  }
}

function printDefaultWindowsPrinter(job) {
  if (process.platform !== 'win32') return Promise.reject(new Error('CODEXSUN Services printing requires Windows.'));
  if (settings.printer.mode === 'raw-escpos') return printRawEscPos(job);
  if (job.receipt) return printFormattedReceipt(job);
  const encodedContent = Buffer.from(job.content, 'utf8').toString('base64');
  const encodedTitle = Buffer.from(job.title, 'utf8').toString('base64');
  const encodedPrinter = Buffer.from(settings.printer.name, 'utf8').toString('base64');
  const script = `$content=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedContent}'))\n$title=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedTitle}'))\n$printerName=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedPrinter}'))\nAdd-Type -AssemblyName System.Drawing\nif (!$printerName) { $printerName=(Get-CimInstance Win32_Printer | Where-Object Default | Select-Object -First 1).Name }\nif (!$printerName) { throw 'No Windows printer is configured.' }\n$doc=New-Object System.Drawing.Printing.PrintDocument\n$doc.DocumentName=$title\n$doc.PrinterSettings.PrinterName=$printerName\nif (!$doc.PrinterSettings.IsValid) { throw 'The selected printer is unavailable.' }\n$doc.DefaultPageSettings.Margins=New-Object System.Drawing.Printing.Margins(0,0,0,0)\n$doc.PrintController=New-Object System.Drawing.Printing.StandardPrintController\n$doc.add_PrintPage({ param($sender,$event) $font=New-Object System.Drawing.Font('Arial',8.5); $format=New-Object System.Drawing.StringFormat; $format.Trimming=[System.Drawing.StringTrimming]::None; $format.FormatFlags=[System.Drawing.StringFormatFlags]::MeasureTrailingSpaces; $lineHeight=[Math]::Ceiling($font.GetHeight($event.Graphics)); $y=4; foreach($line in ($content -split [Environment]::NewLine)){ $event.Graphics.DrawString($line,$font,[System.Drawing.Brushes]::Black,4,$y,$format); $y+=$lineHeight }; $event.HasMorePages=$false })\n$doc.Print()`;
  return runPowerShell(script);
}

function printFormattedReceipt(job) {
  const encodedReceipt = Buffer.from(JSON.stringify(job.receipt), 'utf8').toString('base64');
  const encodedTitle = Buffer.from(job.title, 'utf8').toString('base64');
  const encodedPrinter = Buffer.from(settings.printer.name, 'utf8').toString('base64');
  const script = `$receipt=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedReceipt}')) | ConvertFrom-Json\n$title=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedTitle}'))\n$printerName=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedPrinter}'))\nAdd-Type -AssemblyName System.Drawing\nif (!$printerName) { $printerName=(Get-CimInstance Win32_Printer | Where-Object Default | Select-Object -First 1).Name }\nif (!$printerName) { throw 'No Windows printer is configured.' }\n$doc=New-Object System.Drawing.Printing.PrintDocument\n$doc.DocumentName=$title\n$doc.PrinterSettings.PrinterName=$printerName\nif (!$doc.PrinterSettings.IsValid) { throw 'The selected printer is unavailable.' }\n$height=[Math]::Max(420,320 + ($receipt.lines.Count * 30) + (($receipt.footer -split [Environment]::NewLine).Count * 18))\n$doc.DefaultPageSettings.PaperSize=New-Object System.Drawing.Printing.PaperSize('CODEXSUN 76mm',299,$height)\n$doc.DefaultPageSettings.Margins=New-Object System.Drawing.Printing.Margins(0,0,0,0)\n$doc.PrintController=New-Object System.Drawing.Printing.StandardPrintController\n$doc.add_PrintPage({ param($sender,$event) $black=[System.Drawing.Brushes]::Black; $pen=New-Object System.Drawing.Pen([System.Drawing.Color]::Black,1.4); $normal=New-Object System.Drawing.Font('Arial',9); $bold=New-Object System.Drawing.Font('Arial',9,[System.Drawing.FontStyle]::Bold); $titleFont=New-Object System.Drawing.Font('Arial',12,[System.Drawing.FontStyle]::Bold); $small=New-Object System.Drawing.Font('Arial',8); $totalFont=New-Object System.Drawing.Font('Arial',13,[System.Drawing.FontStyle]::Bold); $left=5; $right=294; $qtyX=177; $rateX=219; $amountX=294; $y=5; $center=New-Object System.Drawing.StringFormat; $center.Alignment=[System.Drawing.StringAlignment]::Center; $rightAlign=New-Object System.Drawing.StringFormat; $rightAlign.Alignment=[System.Drawing.StringAlignment]::Far; $event.Graphics.DrawString($receipt.restaurantName,$titleFont,$black,[System.Drawing.RectangleF]::new($left,$y,$right-$left,18),$center); $y+=18; if($receipt.receiptHeader){$event.Graphics.DrawString($receipt.receiptHeader,$bold,$black,[System.Drawing.RectangleF]::new($left,$y,$right-$left,14),$center);$y+=14}; if($receipt.address){$event.Graphics.DrawString($receipt.address,$small,$black,[System.Drawing.RectangleF]::new($left,$y,$right-$left,14),$center);$y+=16}; if($receipt.contactNumber){$event.Graphics.DrawString($receipt.contactNumber,$bold,$black,[System.Drawing.RectangleF]::new($left,$y,$right-$left,14),$center);$y+=16}; $event.Graphics.DrawLine($pen,$left,$y,$right,$y);$y+=4; $event.Graphics.DrawString('RESTAURANT BILL',$bold,$black,[System.Drawing.RectangleF]::new($left,$y,$right-$left,14),$center);$y+=17; $now=Get-Date; $event.Graphics.DrawString(('Bill No: ' + $receipt.billNumber),$bold,$black,$left,$y); $event.Graphics.DrawString(('Date: ' + $now.ToString('dd/MM/yyyy')),$bold,$black,[System.Drawing.RectangleF]::new(165,$y,129,14),$rightAlign);$y+=14; $event.Graphics.DrawString(('Type: ' + $receipt.tableName),$bold,$black,$left,$y); $event.Graphics.DrawString(('Time: ' + $now.ToString('hh:mm tt')),$bold,$black,[System.Drawing.RectangleF]::new(165,$y,129,14),$rightAlign);$y+=18; $event.Graphics.DrawLine($pen,$left,$y,$right,$y);$y+=4; $event.Graphics.DrawString('ITEM DESCRIPTION',$bold,$black,$left,$y); $event.Graphics.DrawString('QTY',$bold,$black,[System.Drawing.RectangleF]::new($qtyX,$y,34,14),$rightAlign); $event.Graphics.DrawString('RATE',$bold,$black,[System.Drawing.RectangleF]::new(211,$y,42,14),$rightAlign); $event.Graphics.DrawString('AMOUNT',$bold,$black,[System.Drawing.RectangleF]::new(245,$y,49,14),$rightAlign);$y+=16; $event.Graphics.DrawLine($pen,$left,$y,$right,$y);$y+=5; foreach($line in $receipt.lines){ $event.Graphics.DrawString([string]$line.name,$bold,$black,[System.Drawing.RectangleF]::new($left,$y,166,18)); $event.Graphics.DrawString([string]$line.quantity,$normal,$black,[System.Drawing.RectangleF]::new($qtyX,$y,34,18),$rightAlign); $event.Graphics.DrawString(([decimal]$line.rate/100).ToString('0.00'),$normal,$black,[System.Drawing.RectangleF]::new(211,$y,42,18),$rightAlign); $event.Graphics.DrawString(([decimal]$line.amount/100).ToString('0.00'),$bold,$black,[System.Drawing.RectangleF]::new(245,$y,49,18),$rightAlign); $y+=20 }; $y+=2; $event.Graphics.DrawLine($pen,155,$y,$right,$y);$y+=8; $event.Graphics.DrawString(('Total Items: ' + $receipt.lines.Count),$bold,$black,$left,$y); $quantity=($receipt.lines | Measure-Object -Property quantity -Sum).Sum; $event.Graphics.DrawString(('Total Qty: ' + $quantity),$bold,$black,[System.Drawing.RectangleF]::new(170,$y,124,14),$rightAlign);$y+=19; $event.Graphics.DrawString('Sub Total:',$normal,$black,$left,$y); $event.Graphics.DrawString(('₹' + ([decimal]$receipt.subtotal/100).ToString('0.00')),$normal,$black,[System.Drawing.RectangleF]::new(180,$y,114,14),$rightAlign);$y+=17; if([decimal]$receipt.gstAmount -gt 0){$event.Graphics.DrawString('GST:',$normal,$black,$left,$y);$event.Graphics.DrawString(('₹' + ([decimal]$receipt.gstAmount/100).ToString('0.00')),$normal,$black,[System.Drawing.RectangleF]::new(180,$y,114,14),$rightAlign);$y+=17}; $event.Graphics.DrawLine($pen,$left,$y,$right,$y);$y+=5; $event.Graphics.DrawString('NET PAYABLE:',$totalFont,$black,$left,$y); $event.Graphics.DrawString(('₹' + ([decimal]$receipt.total/100).ToString('0.00')),$totalFont,$black,[System.Drawing.RectangleF]::new(170,$y,124,20),$rightAlign);$y+=24; $event.Graphics.DrawLine($pen,$left,$y,$right,$y);$y+=9; foreach($footerLine in ($receipt.footer -split [Environment]::NewLine)){$event.Graphics.DrawString($footerLine,$bold,$black,[System.Drawing.RectangleF]::new($left,$y,$right-$left,15),$center);$y+=15}; $event.HasMorePages=$false })\n$doc.Print()`;
  return runPowerShell(script);
}

function printRawEscPos(job) {
  const encodedContent = Buffer.from(`\u001b@${job.content}\n\n\n\u001dV\0`, 'utf8').toString('base64');
  const encodedPrinter = Buffer.from(settings.printer.name, 'utf8').toString('base64');
  const script = `$printerName=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedPrinter}'))\nif (!$printerName) { throw 'Select a POS printer before using raw ESC/POS.' }\n$bytes=[Convert]::FromBase64String('${encodedContent}')\n$source='using System; using System.Runtime.InteropServices; public static class RawPrinter { [DllImport(\"winspool.drv\", SetLastError=true, CharSet=CharSet.Unicode)] public static extern bool OpenPrinter(string name, out IntPtr handle, IntPtr defaults); [DllImport(\"winspool.drv\", SetLastError=true)] public static extern bool ClosePrinter(IntPtr handle); [DllImport(\"winspool.drv\", SetLastError=true, CharSet=CharSet.Unicode)] public static extern bool StartDocPrinter(IntPtr handle, int level, ref DOCINFO doc); [DllImport(\"winspool.drv\", SetLastError=true)] public static extern bool EndDocPrinter(IntPtr handle); [DllImport(\"winspool.drv\", SetLastError=true)] public static extern bool StartPagePrinter(IntPtr handle); [DllImport(\"winspool.drv\", SetLastError=true)] public static extern bool EndPagePrinter(IntPtr handle); [DllImport(\"winspool.drv\", SetLastError=true)] public static extern bool WritePrinter(IntPtr handle, byte[] bytes, int count, out int written); [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public struct DOCINFO { public string pDocName; public string pOutputFile; public string pDataType; } public static void Send(string printer, byte[] bytes) { IntPtr handle; if (!OpenPrinter(printer,out handle,IntPtr.Zero)) throw new Exception(\"Could not open the selected printer.\"); try { DOCINFO doc=new DOCINFO(); doc.pDocName=\"CODEXSUN Receipt\"; doc.pDataType=\"RAW\"; if (!StartDocPrinter(handle,1,ref doc)) throw new Exception(\"Could not start a raw print job.\"); try { if (!StartPagePrinter(handle)) throw new Exception(\"Could not start a raw print page.\"); try { int written; if (!WritePrinter(handle,bytes,bytes.Length,out written) || written != bytes.Length) throw new Exception(\"Could not write the raw receipt.\"); } finally { EndPagePrinter(handle); } } finally { EndDocPrinter(handle); } } finally { ClosePrinter(handle); } } }'\nAdd-Type -TypeDefinition $source\n[RawPrinter]::Send($printerName,$bytes)`;
  return runPowerShell(script);
}

async function printerInventory() {
  const script = `Get-CimInstance Win32_Printer | Select-Object Name,PortName,DriverName,Default,WorkOffline,PrinterStatus,Network | ConvertTo-Json -Compress`;
  const output = await runPowerShell(script, true);
  const printers = output ? (Array.isArray(JSON.parse(output)) ? JSON.parse(output) : [JSON.parse(output)]) : [];
  return { selected: settings.printer, printers: printers.map((printer) => ({ name: printer.Name, portName: printer.PortName || '', driverName: printer.DriverName || '', isDefault: Boolean(printer.Default), isNetwork: Boolean(printer.Network), status: printer.WorkOffline ? 'offline' : printer.PrinterStatus === 3 ? 'idle' : 'unknown' })) };
}

async function configurePrinter(input) {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const mode = input.mode === 'raw-escpos' ? 'raw-escpos' : 'gdi';
  const inventory = await printerInventory();
  if (name && !inventory.printers.some((printer) => printer.name === name)) throw new Error('Select a printer that is installed in Windows.');
  settings.printer = { name, mode, smoke: { status: 'unverified', checkedAt: null, message: null } };
  saveJson(settingsPath, settings);
  return smokeTestPrinter();
}

async function smokeTestPrinter() {
  try {
    const inventory = await printerInventory();
    const selected = settings.printer.name ? inventory.printers.find((printer) => printer.name === settings.printer.name) : inventory.printers.find((printer) => printer.isDefault);
    if (!selected) throw new Error('No selected or Windows default printer is available.');
    if (selected.status === 'offline') throw new Error(`${selected.name} is offline.`);
    settings.printer = { ...settings.printer, name: settings.printer.name || selected.name, smoke: { status: 'ready', checkedAt: new Date().toISOString(), message: `${selected.name} · ${selected.portName || 'Windows port'} · ${selected.driverName || 'Windows driver'}` } };
  } catch (error) {
    settings.printer = { ...settings.printer, smoke: { status: 'unavailable', checkedAt: new Date().toISOString(), message: error instanceof Error ? error.message : 'Windows printer check failed.' } };
  }
  saveJson(settingsPath, settings);
  return settings.printer;
}

function queuePrinterTest() {
  return enqueuePrint({ id: `test-${Date.now()}`, title: 'CODEXSUN Services printer test', content: 'CODEXSUN Services\nPrinter test successful\n\n\n' });
}

function runPowerShell(script, captureOutput = false) {
  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve(captureOutput ? stdout.trim() : undefined) : reject(new Error(stderr.trim() || 'Windows printer request failed.')));
  });
}

function configureLicense(input) {
  const portalUrl = requireHttpsUrl(input.portalUrl, 'License portal URL');
  const licenseKey = requireText(input.licenseKey, 'License key', 512);
  const productId = requireText(input.productId, 'Product ID', 120);
  settings = { ...settings, portalUrl, licenseKey, productId, license: { status: 'unverified', checkedAt: null } };
  saveJson(settingsPath, settings);
  return { status: 'configured', installationId: settings.installationId };
}

async function verifyLicense() {
  if (!settings.portalUrl || !settings.licenseKey || !settings.productId) return settings.license;
  const endpoint = new URL('/api/v1/licenses/verify', settings.portalUrl).toString();
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ productId: settings.productId, installationId: settings.installationId, licenseKey: settings.licenseKey, service: { name: 'CODEXSUN Services', version: '0.1.0', platform: process.platform } }),
      signal: AbortSignal.timeout(12_000),
    });
    const payload = await response.json().catch(() => ({}));
    settings.license = { status: response.ok && payload.valid === true ? 'valid' : 'invalid', checkedAt: new Date().toISOString(), message: payload.message ?? null };
  } catch (error) {
    settings.license = { status: 'unreachable', checkedAt: new Date().toISOString(), message: error instanceof Error ? error.message : 'License portal is unavailable.' };
  }
  saveJson(settingsPath, settings);
  return settings.license;
}

function loadSettings() {
  const defaults = { installationId: randomUUID(), portalUrl: '', licenseKey: '', productId: '', printer: { name: '', mode: 'gdi', smoke: { status: 'unverified', checkedAt: null, message: null } }, license: { status: 'not-configured', checkedAt: null, message: null } };
  const saved = loadJson(settingsPath, defaults);
  return { ...defaults, ...saved, printer: { ...defaults.printer, ...saved.printer, smoke: { ...defaults.printer.smoke, ...saved.printer?.smoke } } };
}

function loadJson(path, fallback) { try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; } }
function saveJson(path, value) { const temporary = `${path}.tmp`; writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`); renameSync(temporary, path); }
function isAuthorized(request) { return request.headers.authorization === `Bearer ${token}`; }
async function readBody(request) { let text = ''; for await (const chunk of request) { text += chunk; if (text.length > 32_000) throw new Error('Request is too large.'); } const value = JSON.parse(text); if (!value || typeof value !== 'object') throw new Error('Request body is invalid.'); return value; }
function requireText(value, name, maximum) { if (typeof value !== 'string' || !value.trim() || value.length > maximum) throw new Error(`${name} is invalid.`); return value; }
function requireHttpsUrl(value, name) { const url = new URL(requireText(value, name, 2048)); if (url.protocol !== 'https:') throw new Error(`${name} must use HTTPS.`); return url.toString(); }



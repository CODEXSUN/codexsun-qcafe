export type MenuItem = { id: number; code: string; name: string; category: string; price: number };
export type RestaurantTable = { id: number; table_no: string; chair_count: number; status: 'available' | 'occupied' | 'reserved' | 'offline' };
export type PosBill = { id: number; bill_no: string; table_id: number | null; table_no: string; table_chairs: number; guest_count: number; status: 'open' | 'part-paid' | 'paid' | 'void'; taxable_amount: number; gst_percent: number; gst_amount: number; grand_total: number; created_at: string };
export type PosItem = { id: number; pos_id: number; menu_id: number | null; item_code: string; item_name: string; quantity: number; rate: number; amount: number };
export type Receipt = { id: number; receipt_no: string; pos_id: number; pos_amount: number; receipt_amount: number; created_at: string };
export type ReceiptTransaction = { id: number; receipt_id: number; transaction_mode: 'cash' | 'card' | 'upi' | 'bank' | 'other'; amount: number; denominations: string | null; settlement_nature: 'collection' | 'advance' | 'refund' | 'adjustment'; reference_no: string | null; created_at: string };
export type Order = { id: number; table_name: string; status: string; total: number; created_at: string };
export type Stock = { id: number; name: string; unit: string; quantity: number; minimum: number };
export type Booking = { id: number; guest: string; guests: number; table_name: string; starts_at: string; status: string };
export type Activity = { id: number; entity_type: string; entity_id: string; action: string; detail: string; created_at: string };
export type Snapshot = { menu: MenuItem[]; restaurant_tables: RestaurantTable[]; pos: PosBill[]; pos_items: PosItem[]; receipts: Receipt[]; receipt_transactions: ReceiptTransaction[]; orders: Order[]; inventory: Stock[]; bookings: Booking[]; order_lines: { order_id: number; name: string; quantity: number }[]; activities: Activity[]; demo: boolean };
export type ActionResult<T> = { ok: true; result: T };
export const money = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount / 100);
const base = isDesktopRuntime() ? 'http://127.0.0.1:4180/api/v1/q-cafe' : '/api/v1/q-cafe';
export async function signIn(pin: string): Promise<string> {
  const response = await fetch(`${base}/auth/pin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error ?? 'Unable to sign in.');
  return value.access_token;
}
export async function signInWithCredentials(username: string, password: string): Promise<string> {
  const response = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, pin: password }),
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error ?? 'Unable to sign in with username.');
  return value.access_token;
}
export async function request<T>(token: string, path = '', body?: unknown): Promise<T> {
  const response = await fetch(`${base}${path}`, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error ?? 'Q Cafe is unavailable.');
  return value;
}

function isDesktopRuntime() {
  return '__TAURI_INTERNALS__' in window || location.protocol === 'tauri:' || location.hostname === 'tauri.localhost';
}

export async function setupOwner(pin: string): Promise<string> {
  const response = await fetch(`${base}/auth/setup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login: 'owner', name: 'Q Cafe owner', pin }) });
  const payload = await response.json() as { access_token?: string; error?: string };
  if (!response.ok || !payload.access_token) throw new Error(payload.error ?? 'Could not set owner PIN.');
  return payload.access_token;
}

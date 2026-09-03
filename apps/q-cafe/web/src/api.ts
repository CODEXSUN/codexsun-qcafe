export type MenuItem = { id: number; name: string; category: string; price: number };
export type Order = { id: number; table_name: string; status: string; total: number; created_at: string };
export type Stock = { id: number; name: string; unit: string; quantity: number; minimum: number };
export type Booking = { id: number; guest: string; guests: number; table_name: string; starts_at: string; status: string };
export type Snapshot = { menu: MenuItem[]; orders: Order[]; inventory: Stock[]; bookings: Booking[]; order_lines: { order_id: number; name: string; quantity: number }[]; demo: boolean };
export const money = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount / 100);
export async function request<T>(token: string, path = '', body?: unknown): Promise<T> {
  const response = await fetch(`/api/v1/q-cafe${path}`, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error ?? 'Q Cafe is unavailable.');
  return value;
}

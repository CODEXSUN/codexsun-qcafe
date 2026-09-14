import { imageUrl, type MenuItem, type RestaurantTable } from './api';

export type CustomMenuItem = MenuItem & {
  image?: string;
  normalPrice: number;
  specialPrices: ItemSpecialPrice[];
  activeSpecial?: ItemSpecialPrice;
};

export type ItemSpecialPrice = {
  prefix: string;
  name: string;
  price: number;
  isEnabled: boolean;
};

export type TableMasterConfig = {
  tableNo: string;
  chairCount: number;
  type: 'dine-in' | 'parcel';
  shape: 'square' | 'round' | 'rectangle';
  isActive: boolean;
};

export function getMergedMenu(apiMenu: MenuItem[] = [], activeSpecialPrefix?: string): CustomMenuItem[] {
  return apiMenu.map((item) => {
    const specialPrices = parseSpecialPrices(item.specials);
    const activeSpecial = activeSpecialPrefix
      ? specialPrices.find((special) => special.isEnabled && special.prefix === activeSpecialPrefix)
      : undefined;
    return {
      ...item,
      price: activeSpecial?.price ?? item.price,
      category: item.category || 'Uncategorized',
      image: imageUrl(item.image_path),
      normalPrice: item.price,
      specialPrices,
      activeSpecial,
    };
  });
}

function parseSpecialPrices(value?: string): ItemSpecialPrice[] {
  if (!value) return [];
  try {
    const records = JSON.parse(value);
    if (!Array.isArray(records)) return [];
    return records.flatMap((record): ItemSpecialPrice[] => {
      const prefix = String(record?.prefix ?? '').trim().toUpperCase();
      const name = String(record?.name ?? '').trim();
      const price = Number(record?.price ?? 0);
      const isEnabled = record?.is_enabled !== false && Number(record?.is_enabled ?? 1) !== 0;
      return prefix && name && Number.isFinite(price) && price > 0
        ? [{ prefix, name, price, isEnabled }]
        : [];
    });
  } catch {
    return [];
  }
}

export function getMergedTables(apiTables: RestaurantTable[] = []): TableMasterConfig[] {
  return apiTables.map((table) => {
    const number = Number.parseInt(table.table_no.replace(/\D/g, '') || '0', 10);
    return {
      tableNo: table.table_no,
      chairCount: table.chair_count,
      type: 'dine-in',
      shape: table.chair_count > 4 || number > 8 ? 'rectangle' : 'square',
      isActive: table.status !== 'offline',
    };
  });
}

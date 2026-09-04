import type { MenuItem, RestaurantTable } from './api';

export type CustomMenuItem = MenuItem & {
  image?: string;
  isCustom?: boolean;
};

export type TableMasterConfig = {
  tableNo: string;
  chairCount: number;
  type: 'dine-in' | 'parcel';
  shape: 'square' | 'round' | 'rectangle';
  isActive: boolean;
};

export const DEFAULT_ITEM_IMAGES: Record<string, string> = {
  'ITM-001': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=200&q=80', // Filter coffee
  'ITM-002': 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=200&q=80', // Cappuccino
  'ITM-003': 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=200&q=80', // Iced latte
  'ITM-004': 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=200&q=80', // Masala chai
  'ITM-005': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=200&q=80', // Paneer sandwich
  'ITM-006': 'https://images.unsplash.com/photo-1621996346565-e3d5d6281699?auto=format&fit=crop&w=200&q=80', // Pesto pasta
  'ITM-007': 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=200&q=80', // Butter croissant
  'ITM-008': 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=200&q=80', // Chocolate brownie
};

export const PRESET_FOOD_IMAGES = [
  { label: 'Filter Coffee', url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=300&q=80' },
  { label: 'Cappuccino / Latte', url: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=300&q=80' },
  { label: 'Iced Coffee', url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=300&q=80' },
  { label: 'Masala Chai', url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=300&q=80' },
  { label: 'Toasted Sandwich', url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=300&q=80' },
  { label: 'Pasta', url: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281699?auto=format&fit=crop&w=300&q=80' },
  { label: 'Butter Croissant', url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=300&q=80' },
  { label: 'Chocolate Brownie', url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=300&q=80' },
  { label: 'Blueberry Muffin', url: 'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?auto=format&fit=crop&w=300&q=80' },
  { label: 'Cheeseburger', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80' },
  { label: 'Fresh Juice', url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=300&q=80' },
  { label: 'Cheesecake', url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=300&q=80' },
];

const CUSTOM_MENU_KEY = 'q-cafe-custom-menu';
const ITEM_IMAGES_KEY = 'q-cafe-item-images';
const TABLE_CONFIG_KEY = 'q-cafe-table-config';

export function getCustomMenuItems(): CustomMenuItem[] {
  try {
    const raw = localStorage.getItem(CUSTOM_MENU_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getItemImages(): Record<string, string> {
  try {
    const raw = localStorage.getItem(ITEM_IMAGES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getMergedMenu(apiMenu: MenuItem[] = []): CustomMenuItem[] {
  const customItems = getCustomMenuItems();
  const imageMap = getItemImages();

  // Create merged list starting with API items
  const itemMap = new Map<string, CustomMenuItem>();

  for (const item of apiMenu) {
    const code = item.code.trim().toUpperCase();
    itemMap.set(code, {
      ...item,
      image: imageMap[code] || DEFAULT_ITEM_IMAGES[code],
      isCustom: false,
    });
  }

  for (const custom of customItems) {
    const code = custom.code.trim().toUpperCase();
    const existing = itemMap.get(code);
    itemMap.set(code, {
      ...existing,
      ...custom,
      image: imageMap[code] || custom.image || DEFAULT_ITEM_IMAGES[code],
      isCustom: true,
    });
  }

  return Array.from(itemMap.values());
}

function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`[mastersStore] Storage quota exceeded or unavailable for ${key}:`, error);
    return false;
  }
}

export function saveCustomMenuItem(item: CustomMenuItem): void {
  const code = item.code.trim().toUpperCase();
  const currentCustom = getCustomMenuItems();
  const index = currentCustom.findIndex((c) => c.code.trim().toUpperCase() === code);

  if (index >= 0) {
    currentCustom[index] = { ...currentCustom[index]!, ...item, code };
  } else {
    currentCustom.push({ ...item, code, isCustom: true });
  }
  safeSetItem(CUSTOM_MENU_KEY, JSON.stringify(currentCustom));

  if (item.image) {
    const images = getItemImages();
    images[code] = item.image;
    safeSetItem(ITEM_IMAGES_KEY, JSON.stringify(images));
  }

  window.dispatchEvent(new CustomEvent('q-cafe-menu-updated'));
}

export function deleteCustomMenuItem(code: string): void {
  const upper = code.trim().toUpperCase();
  const currentCustom = getCustomMenuItems();
  const filtered = currentCustom.filter((c) => c.code.trim().toUpperCase() !== upper);
  safeSetItem(CUSTOM_MENU_KEY, JSON.stringify(filtered));

  const images = getItemImages();
  if (images[upper]) {
    delete images[upper];
    safeSetItem(ITEM_IMAGES_KEY, JSON.stringify(images));
  }

  window.dispatchEvent(new CustomEvent('q-cafe-menu-updated'));
}

export function getTableConfigs(): Record<string, Partial<TableMasterConfig>> {
  try {
    const raw = localStorage.getItem(TABLE_CONFIG_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getMergedTables(apiTables: RestaurantTable[] = []): TableMasterConfig[] {
  const configs = getTableConfigs();

  const base: TableMasterConfig[] = (apiTables && apiTables.length > 0)
    ? apiTables.map((t) => {
        const num = parseInt(t.table_no.replace(/\D/g, '') || '0', 10);
        return {
          tableNo: t.table_no,
          chairCount: t.chair_count || (num <= 8 ? 4 : 6),
          type: 'dine-in',
          shape: (t.chair_count > 4 || num > 8 ? 'rectangle' : 'square'),
          isActive: t.status !== 'offline',
        };
      })
    : Array.from({ length: 12 }, (_, i) => {
        const num = i + 1;
        const no = `T${String(num).padStart(2, '0')}`;
        return {
          tableNo: no,
          chairCount: num <= 8 ? 4 : 6,
          type: 'dine-in' as const,
          shape: (num <= 8 ? 'square' : 'rectangle') as 'square' | 'rectangle',
          isActive: true,
        };
      });

  if (!base.some((t) => t.tableNo.toLowerCase() === 'parcel')) {
    base.push({
      tableNo: 'Parcel',
      chairCount: 4,
      type: 'parcel',
      shape: 'round',
      isActive: true,
    });
  }

  // Apply custom overrides
  return base.map((table) => {
    const override = configs[table.tableNo];
    if (!override) return table;
    return {
      ...table,
      ...override,
    };
  });
}

export function saveTableConfig(tableNo: string, updates: Partial<TableMasterConfig>): void {
  const configs = getTableConfigs();
  configs[tableNo] = {
    ...(configs[tableNo] || {}),
    ...updates,
  };
  safeSetItem(TABLE_CONFIG_KEY, JSON.stringify(configs));
  window.dispatchEvent(new CustomEvent('q-cafe-tables-updated'));
}

export function addCustomTable(table: TableMasterConfig): void {
  saveTableConfig(table.tableNo, table);
}

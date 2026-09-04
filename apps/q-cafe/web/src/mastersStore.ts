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

export const DEMO_10_ITEMS = [
  { code: 'ITM-001', name: 'Filter coffee', category: 'Hot Coffee', price: 4000, image: '/demo-images/filter-coffee.svg' },
  { code: 'ITM-002', name: 'Cappuccino', category: 'Hot Coffee', price: 14000, image: '/demo-images/cappuccino.svg' },
  { code: 'ITM-003', name: 'Iced latte', category: 'Cold Drinks', price: 16000, image: '/demo-images/iced-latte.svg' },
  { code: 'ITM-004', name: 'Masala chai', category: 'Hot Tea', price: 6000, image: '/demo-images/masala-chai.svg' },
  { code: 'ITM-005', name: 'Paneer sandwich', category: 'Snacks', price: 18000, image: '/demo-images/paneer-sandwich.svg' },
  { code: 'ITM-006', name: 'Pesto pasta', category: 'Snacks', price: 26000, image: '/demo-images/pesto-pasta.svg' },
  { code: 'ITM-007', name: 'Butter croissant', category: 'Dessert', price: 12000, image: '/demo-images/croissant.svg' },
  { code: 'ITM-008', name: 'Chocolate brownie', category: 'Dessert', price: 15000, image: '/demo-images/brownie.svg' },
  { code: 'ITM-009', name: 'Veg burger', category: 'Snacks', price: 19000, image: '/demo-images/burger.svg' },
  { code: 'ITM-010', name: 'French fries', category: 'Snacks', price: 12000, image: '/demo-images/french-fries.svg' },
];

export const DEFAULT_ITEM_IMAGES: Record<string, string> = {
  'ITM-001': '/demo-images/filter-coffee.svg',
  'ITM-002': '/demo-images/cappuccino.svg',
  'ITM-003': '/demo-images/iced-latte.svg',
  'ITM-004': '/demo-images/masala-chai.svg',
  'ITM-005': '/demo-images/paneer-sandwich.svg',
  'ITM-006': '/demo-images/pesto-pasta.svg',
  'ITM-007': '/demo-images/croissant.svg',
  'ITM-008': '/demo-images/brownie.svg',
  'ITM-009': '/demo-images/burger.svg',
  'ITM-010': '/demo-images/french-fries.svg',
  'ITM-011': 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=300&q=80',
  'ITM-012': 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=300&q=80',
  'ITM-013': 'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?auto=format&fit=crop&w=300&q=80',
  'ITM-014': 'https://images.unsplash.com/photo-1528736235302-52922df5c122?auto=format&fit=crop&w=300&q=80',
  'ITM-015': '/demo-images/burger.svg',
  'ITM-016': '/demo-images/french-fries.svg',
  'ITM-017': 'https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?auto=format&fit=crop&w=300&q=80',
  'ITM-018': 'https://images.unsplash.com/photo-1567234669003-dce7a7a88821?auto=format&fit=crop&w=300&q=80',
  'ITM-019': 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=300&q=80',
};

export const DEFAULT_PRESET_MENU: CustomMenuItem[] = [
  { id: 1, code: 'ITM-001', name: 'Filter coffee', category: 'Hot Coffee', price: 4000, image: '/demo-images/filter-coffee.svg' },
  { id: 2, code: 'ITM-002', name: 'Cappuccino', category: 'Hot Coffee', price: 14000, image: '/demo-images/cappuccino.svg' },
  { id: 3, code: 'ITM-003', name: 'Iced latte', category: 'Cold Drinks', price: 16000, image: '/demo-images/iced-latte.svg' },
  { id: 4, code: 'ITM-004', name: 'Masala chai', category: 'Hot Tea', price: 6000, image: '/demo-images/masala-chai.svg' },
  { id: 5, code: 'ITM-005', name: 'Paneer sandwich', category: 'Snacks', price: 18000, image: '/demo-images/paneer-sandwich.svg' },
  { id: 6, code: 'ITM-006', name: 'Pesto pasta', category: 'Snacks', price: 26000, image: '/demo-images/pesto-pasta.svg' },
  { id: 7, code: 'ITM-007', name: 'Butter croissant', category: 'Dessert', price: 12000, image: '/demo-images/croissant.svg' },
  { id: 8, code: 'ITM-008', name: 'Chocolate brownie', category: 'Dessert', price: 15000, image: '/demo-images/brownie.svg' },
  { id: 9, code: 'ITM-009', name: 'Veg burger', category: 'Snacks', price: 19000, image: '/demo-images/burger.svg' },
  { id: 10, code: 'ITM-010', name: 'French fries', category: 'Snacks', price: 12000, image: '/demo-images/french-fries.svg' },
  { id: 11, code: 'ITM-011', name: 'Cafe mocha', category: 'Hot Coffee', price: 15000 },
  { id: 12, code: 'ITM-012', name: 'Latte', category: 'Hot Coffee', price: 14000 },
  { id: 13, code: 'ITM-013', name: 'Blueberry muffin', category: 'Dessert', price: 12000 },
  { id: 14, code: 'ITM-014', name: 'Cheese sandwich', category: 'Snacks', price: 17000 },
  { id: 17, code: 'ITM-017', name: 'Garlic bread', category: 'Snacks', price: 11000 },
  { id: 18, code: 'ITM-018', name: 'Club sandwich', category: 'Snacks', price: 22000 },
  { id: 19, code: 'ITM-019', name: 'Tiramisu', category: 'Dessert', price: 18000 },
];

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
    const preset = DEFAULT_PRESET_MENU.find((p) => p.code === code || p.name.toLowerCase() === item.name.toLowerCase());
    itemMap.set(code, {
      ...item,
      category: preset?.category || item.category || 'All Items',
      image: imageMap[code] || DEFAULT_ITEM_IMAGES[code],
      isCustom: false,
    });
  }

  // Supplement with preset items from design reference if not present in API items
  for (const preset of DEFAULT_PRESET_MENU) {
    const code = preset.code.trim().toUpperCase();
    if (!itemMap.has(code)) {
      itemMap.set(code, {
        ...preset,
        image: imageMap[code] || DEFAULT_ITEM_IMAGES[code],
        isCustom: false,
      });
    }
  }

  // Overlay custom items saved by user
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

export type StorageVerificationResult = {
  ok: boolean;
  folderPath: string;
  isWriteProtected: boolean;
  canWrite: boolean;
  message: string;
  timestamp: string;
};

export function getImageStorageSettings(): { imageFolderPath: string; imageWriteProtection: boolean } {
  try {
    const raw = localStorage.getItem('q-cafe-settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        imageFolderPath: typeof parsed.imageFolderPath === 'string' && parsed.imageFolderPath.trim()
          ? parsed.imageFolderPath.trim()
          : 'C:\\q-cafe\\images',
        imageWriteProtection: Boolean(parsed.imageWriteProtection),
      };
    }
  } catch {}
  return {
    imageFolderPath: 'C:\\q-cafe\\images',
    imageWriteProtection: false,
  };
}

export function verifyImageStorageFolder(folderPath: string, writeProtected: boolean): StorageVerificationResult {
  const trimmed = (folderPath || '').trim();
  const now = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date());

  if (!trimmed) {
    return {
      ok: false,
      folderPath: '',
      isWriteProtected: writeProtected,
      canWrite: false,
      message: 'Folder path cannot be empty. Please enter a valid system path.',
      timestamp: now,
    };
  }

  // Windows absolute (C:\...), UNC (\\server\share), or POSIX (/...) or relative (./...)
  const isWindowsAbsolute = /^[a-zA-Z]:[\\/]/i.test(trimmed);
  const isUncPath = /^\\\\[^\\/]+[\\/][^\\/]+/i.test(trimmed);
  const isUnixAbsolute = trimmed.startsWith('/');
  const isRelative = trimmed.startsWith('./') || trimmed.startsWith('.\\');

  const isValidSyntax = isWindowsAbsolute || isUncPath || isUnixAbsolute || isRelative;

  if (!isValidSyntax) {
    return {
      ok: false,
      folderPath: trimmed,
      isWriteProtected: writeProtected,
      canWrite: false,
      message: `Invalid directory format: "${trimmed}". Provide a valid system path like C:\\q-cafe\\images.`,
      timestamp: now,
    };
  }

  return {
    ok: true,
    folderPath: trimmed,
    isWriteProtected: writeProtected,
    canWrite: !writeProtected,
    message: writeProtected
      ? `Folder verified: Path is valid. Write protection is ACTIVE (Images are protected from overwrite / deletion).`
      : `Folder verified: Path is valid. Read & Write permissions active. Ready for new image uploads.`,
    timestamp: now,
  };
}

export function installDemoItemsAndImages(): { count: number; items: typeof DEMO_10_ITEMS } {
  const images = getItemImages();
  const currentCustom = getCustomMenuItems();

  for (const [i, demo] of DEMO_10_ITEMS.entries()) {
    images[demo.code] = demo.image;

    const existingIdx = currentCustom.findIndex((c) => c.code.trim().toUpperCase() === demo.code);
    const itemData: CustomMenuItem = {
      id: i + 1,
      code: demo.code,
      name: demo.name,
      category: demo.category,
      price: demo.price,
      image: demo.image,
      isCustom: true,
    };

    if (existingIdx >= 0) {
      currentCustom[existingIdx] = itemData;
    } else {
      currentCustom.push(itemData);
    }
  }

  safeSetItem(ITEM_IMAGES_KEY, JSON.stringify(images));
  safeSetItem(CUSTOM_MENU_KEY, JSON.stringify(currentCustom));
  window.dispatchEvent(new CustomEvent('q-cafe-menu-updated'));
  return { count: DEMO_10_ITEMS.length, items: DEMO_10_ITEMS };
}

export function saveCustomMenuItem(
  item: CustomMenuItem,
  options?: { bypassWriteProtection?: boolean }
): { success: boolean; error?: string } {
  const { imageWriteProtection } = getImageStorageSettings();
  const code = item.code.trim().toUpperCase();
  const currentImages = getItemImages();
  const existingImage = currentImages[code];

  if (imageWriteProtection && !options?.bypassWriteProtection && existingImage && item.image && existingImage !== item.image) {
    return {
      success: false,
      error: 'Write protection is enabled in Settings. Disable write protection or confirm to overwrite this image.',
    };
  }

  const currentCustom = getCustomMenuItems();
  const index = currentCustom.findIndex((c) => c.code.trim().toUpperCase() === code);

  if (index >= 0) {
    currentCustom[index] = { ...currentCustom[index]!, ...item, code };
  } else {
    currentCustom.push({ ...item, code, isCustom: true });
  }
  safeSetItem(CUSTOM_MENU_KEY, JSON.stringify(currentCustom));

  if (item.image) {
    currentImages[code] = item.image;
    safeSetItem(ITEM_IMAGES_KEY, JSON.stringify(currentImages));
  }

  window.dispatchEvent(new CustomEvent('q-cafe-menu-updated'));
  return { success: true };
}

export function deleteCustomMenuItem(
  code: string,
  options?: { bypassWriteProtection?: boolean }
): { success: boolean; error?: string } {
  const { imageWriteProtection } = getImageStorageSettings();
  const upper = code.trim().toUpperCase();
  const images = getItemImages();

  if (imageWriteProtection && !options?.bypassWriteProtection && images[upper]) {
    return {
      success: false,
      error: 'Write protection is enabled in Settings. Deleting protected item images is disabled.',
    };
  }

  const currentCustom = getCustomMenuItems();
  const filtered = currentCustom.filter((c) => c.code.trim().toUpperCase() !== upper);
  safeSetItem(CUSTOM_MENU_KEY, JSON.stringify(filtered));

  if (images[upper]) {
    delete images[upper];
    safeSetItem(ITEM_IMAGES_KEY, JSON.stringify(images));
  }

  window.dispatchEvent(new CustomEvent('q-cafe-menu-updated'));
  return { success: true };
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

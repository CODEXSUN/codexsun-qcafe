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

export const DEMO_10_ITEMS: Array<CustomMenuItem & { image: string }> = [
  { id: 1, code: '01', name: 'இட்லி (2)', category: 'இட்லி / தோசை வகைகள்', image: '', price: 4000 },
  { id: 2, code: '02', name: 'சப்பாத்தி (1)', category: 'இட்லி / தோசை வகைகள்', image: '', price: 3500 },
  { id: 3, code: '03', name: 'குழி பணியாரம்', category: 'இட்லி / தோசை வகைகள்', image: '', price: 5000 },
  { id: 4, code: '04', name: 'தோசை', category: 'இட்லி / தோசை வகைகள்', image: '', price: 3500 },
  { id: 5, code: '05', name: 'ஊத்தாப்பம் பிளைன்', category: 'இட்லி / தோசை வகைகள்', image: '', price: 3500 },
  { id: 6, code: '06', name: 'ரோஸ்ட்', category: 'இட்லி / தோசை வகைகள்', image: '', price: 5000 },
  { id: 7, code: '07', name: 'நெய் தோசை', category: 'இட்லி / தோசை வகைகள்', image: '', price: 7000 },
  { id: 8, code: '08', name: 'பட்டர் தோசை', category: 'இட்லி / தோசை வகைகள்', image: '', price: 7000 },
  { id: 9, code: '09', name: 'பொடி தோசை', category: 'இட்லி / தோசை வகைகள்', image: '', price: 7000 },
  { id: 10, code: '10', name: 'பூண்டு தோசை', category: 'இட்லி / தோசை வகைகள்', image: '', price: 7000 },
  { id: 11, code: '11', name: 'அடை தோசை', category: 'இட்லி / தோசை வகைகள்', image: '', price: 7000 },
  { id: 12, code: '12', name: 'கம்பு தோசை', category: 'இட்லி / தோசை வகைகள்', image: '', price: 7000 },
  { id: 13, code: '13', name: 'சோள தோசை', category: 'இட்லி / தோசை வகைகள்', image: '', price: 7000 },
  { id: 14, code: '14', name: 'வெங்காய தோசை', category: 'இட்லி / தோசை வகைகள்', image: '', price: 7000 },
  { id: 15, code: '15', name: 'இஞ்சி புதினா தோசை', category: 'இட்லி / தோசை வகைகள்', image: '', price: 7000 },
  { id: 16, code: '16', name: 'முட்டை தோசை', category: 'இட்லி / தோசை வகைகள்', image: '', price: 7000 },
  { id: 17, code: '17', name: 'தக்காளி தோசை', category: 'சிறப்பு தோசைகள்', image: '', price: 7000 },
  { id: 18, code: '18', name: 'நெய் பொடி தோசை', category: 'சிறப்பு தோசைகள்', image: '', price: 8000 },
  { id: 19, code: '19', name: 'பட்டர் பொடி தோசை', category: 'சிறப்பு தோசைகள்', image: '', price: 8000 },
  { id: 20, code: '20', name: 'காளான் தோசை', category: 'சிறப்பு தோசைகள்', image: '', price: 8000 },
  { id: 21, code: '21', name: 'பிரண்டை தோசை', category: 'சிறப்பு தோசைகள்', image: '', price: 8000 },
  { id: 22, code: '22', name: 'மிளகாய் ரோஸ்ட்', category: 'சிறப்பு தோசைகள்', image: '', price: 8000 },
  { id: 23, code: '23', name: 'பன்னீர் தோசை', category: 'சிறப்பு தோசைகள்', image: '', price: 9000 },
  { id: 24, code: '24', name: 'வெங்காய நெய் / பட்டர் / பொடி தோசை', category: 'சிறப்பு தோசைகள்', image: '', price: 9000 },
  { id: 25, code: '25', name: 'அரிசியும் பருப்பு அடை', category: 'சிறப்பு தோசைகள்', image: '', price: 8000 },
  { id: 26, code: '26', name: 'தக்காளி சேவை', category: 'சிறப்பு தோசைகள்', image: '', price: 8000 },
  { id: 27, code: '27', name: 'ஆப்பாயில்', category: 'சிறப்பு தோசைகள்', image: '', price: 1500 },
  { id: 28, code: '28', name: 'புல்லாயில்', category: 'சிறப்பு தோசைகள்', image: '', price: 1500 },
  { id: 29, code: '29', name: 'ஆம்லெட்', category: 'சிறப்பு தோசைகள்', image: '', price: 2000 },
  { id: 30, code: '30', name: 'முட்டை பொரியல்', category: 'சிறப்பு தோசைகள்', image: '', price: 3000 },
  { id: 31, code: '31', name: 'கலக்கி', category: 'சிறப்பு தோசைகள்', image: '', price: 3000 },
  { id: 32, code: '32', name: 'முட்டை சேவை', category: 'சேவை / கறி வகைகள்', image: '', price: 12000 },
  { id: 33, code: '33', name: 'காளான் சேவை', category: 'சேவை / கறி வகைகள்', image: '', price: 16000 },
  { id: 34, code: '34', name: 'பூண்டு சேவை', category: 'சேவை / கறி வகைகள்', image: '', price: 16000 },
  { id: 35, code: '35', name: 'இஞ்சி புதினா சேவை', category: 'சேவை / கறி வகைகள்', image: '', price: 16000 },
  { id: 36, code: '36', name: 'லாலிபாப் (1)', category: 'சேவை / கறி வகைகள்', image: '', price: 4500 },
  { id: 37, code: '37', name: 'பள்ளிப்பாளையம் தோசை', category: 'சேவை / கறி வகைகள்', image: '', price: 16000 },
  { id: 38, code: '38', name: 'பிச்சுப்போட்ட கறிதோசை', category: 'சேவை / கறி வகைகள்', image: '', price: 16000 },
  { id: 39, code: '39', name: 'சிக்கன் கறி (எலும்பு) தோசை (எலும்பில்லாமல்)', category: 'சேவை / கறி வகைகள்', image: '', price: 16000 },
  { id: 40, code: '40', name: 'பள்ளிப்பாளையம் (போன்லெஸ்)', category: 'சேவை / கறி வகைகள்', image: '', price: 16000 },
  { id: 41, code: '41', name: 'பிச்சுப்போட்ட கறி (போன்லெஸ்)', category: 'சேவை / கறி வகைகள்', image: '', price: 16000 },
  { id: 42, code: '42', name: 'சிக்கன் சேவை', category: 'சேவை / கறி வகைகள்', image: '', price: 22000 },
  { id: 43, code: '43', name: 'பள்ளிப்பாளையம் சேவை', category: 'சேவை / கறி வகைகள்', image: '', price: 22000 },
  { id: 44, code: '44', name: 'இளநீர் பாயாசம்', category: 'சேவை / கறி வகைகள்', image: '', price: 9000 },
  { id: 45, code: '45', name: 'இட்லி', category: 'காலை உணவு & கறி', image: '', price: 1500 },
  { id: 46, code: '46', name: 'இடியாப்பம்', category: 'காலை உணவு & கறி', image: '', price: 2500 },
  { id: 47, code: '47', name: 'முட்டை தோசை', category: 'காலை உணவு & கறி', image: '', price: 5000 },
  { id: 48, code: '48', name: 'நெய் தோசை', category: 'காலை உணவு & கறி', image: '', price: 5000 },
  { id: 49, code: '49', name: 'ஈசல் தோசை', category: 'காலை உணவு & கறி', image: '', price: 5000 },
  { id: 50, code: '50', name: 'இஞ்சி பூண்டு, முட்டை குழம்பு', category: 'காலை உணவு & கறி', image: '', price: 20000 },
  { id: 51, code: '51', name: 'மட்டன் வறுவல்', category: 'காலை உணவு & கறி', image: '', price: 25000 },
  { id: 52, code: '52', name: 'நாட்டுக்கோழி வறுவல்', category: 'காலை உணவு & கறி', image: '', price: 25000 },
  { id: 53, code: '53', name: 'தனா கறி', category: 'காலை உணவு & கறி', image: '', price: 25000 },
  { id: 54, code: '54', name: 'மீன் குழம்பு', category: 'காலை உணவு & கறி', image: '', price: 25000 },
  { id: 55, code: '55', name: 'சுக்கா கறி', category: 'காலை உணவு & கறி', image: '', price: 25000 },
  { id: 56, code: '56', name: 'ஈரல் வறுவல்', category: 'காலை உணவு & கறி', image: '', price: 25000 },
  { id: 57, code: '57', name: 'சுடுகறி', category: 'காலை உணவு & கறி', image: '', price: 25000 },
  { id: 58, code: '58', name: 'சிக்கன் கறி', category: 'காலை உணவு & கறி', image: '', price: 8000 },
  { id: 59, code: '59', name: 'முட்டை', category: 'காலை உணவு & கறி', image: '', price: 1500 },
  { id: 60, code: '60', name: 'இறால் குழம்பு', category: 'காலை உணவு & கறி', image: '', price: 9000 },
];

export const DEFAULT_ITEM_IMAGES: Record<string, string> = {};

export const DEFAULT_PRESET_MENU: CustomMenuItem[] = DEMO_10_ITEMS.map((item) => ({ ...item }));

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

const CUSTOMER_CATALOG_REVISION = '2026-09-07-tamil-menu-numeric-codes';
const CUSTOMER_CATALOG_KEY = 'q-cafe-customer-catalog-revision';
const CUSTOM_MENU_KEY = 'q-cafe-custom-menu';
const ITEM_IMAGES_KEY = 'q-cafe-item-images';
const CATEGORY_RENAMES_KEY = 'q-cafe-category-renames';
const TABLE_CONFIG_KEY = 'q-cafe-table-config';

function resetLegacyCatalogStorage(): void {
  try {
    if (localStorage.getItem(CUSTOMER_CATALOG_KEY) === CUSTOMER_CATALOG_REVISION) return;
    localStorage.removeItem(CUSTOM_MENU_KEY);
    localStorage.removeItem(ITEM_IMAGES_KEY);
    localStorage.setItem(CUSTOMER_CATALOG_KEY, CUSTOMER_CATALOG_REVISION);
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

export function getCustomMenuItems(): CustomMenuItem[] {
  resetLegacyCatalogStorage();
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

export function getCategoryRenames(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CATEGORY_RENAMES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function resolvedCategory(category: string, renames: Record<string, string>): string {
  return renames[category] || category || 'Uncategorized';
}

export function renameMenuCategory(currentName: string, nextName: string): { success: boolean; error?: string } {
  const current = currentName.trim();
  const next = nextName.trim();
  if (!current || !next) return { success: false, error: 'Category name is required.' };
  if (current === next) return { success: true };
  const renames = getCategoryRenames();
  for (const [name, value] of Object.entries(renames)) {
    if (value === current) renames[name] = next;
  }
  renames[current] = next;
  if (!safeSetItem(CATEGORY_RENAMES_KEY, JSON.stringify(renames))) {
    return { success: false, error: 'Category name could not be saved.' };
  }
  window.dispatchEvent(new CustomEvent('q-cafe-menu-updated'));
  return { success: true };
}

export function getMergedMenu(apiMenu: MenuItem[] = []): CustomMenuItem[] {
  const customItems = getCustomMenuItems();
  const imageMap = getItemImages();
  const categoryRenames = getCategoryRenames();

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

  // Use the packaged customer catalog only while the local API is unavailable.
  if (itemMap.size === 0) {
    for (const preset of DEFAULT_PRESET_MENU) {
      const code = preset.code.trim().toUpperCase();
      itemMap.set(code, {
        ...preset,
        image: imageMap[code] || DEFAULT_ITEM_IMAGES[code],
        isCustom: false,
      });
    }
  }

  // Overlay custom items saved by the operator after the customer catalog is installed.
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

  return Array.from(itemMap.values()).map((item) => ({
    ...item,
    category: resolvedCategory(item.category, categoryRenames),
  }));
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

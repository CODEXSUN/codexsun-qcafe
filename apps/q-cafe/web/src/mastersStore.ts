import { imageUrl, type MenuItem, type RestaurantTable } from './api';

export type CustomMenuItem = MenuItem & {
  image?: string;
};

export type TableMasterConfig = {
  tableNo: string;
  chairCount: number;
  type: 'dine-in' | 'parcel';
  shape: 'square' | 'round' | 'rectangle';
  isActive: boolean;
};

export function getMergedMenu(apiMenu: MenuItem[] = []): CustomMenuItem[] {
  return apiMenu.map((item) => ({
    ...item,
    category: item.category || 'Uncategorized',
    image: imageUrl(item.image_path),
  }));
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

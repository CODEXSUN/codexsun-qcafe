import type { RefObject } from 'react';
import type { InterfaceTopologyController } from '@codexsun/devkit-ito';
import type { CustomMenuItem } from '../mastersStore';

export type EntryLine = {
  key: string;
  menuId?: number;
  code: string;
  name: string;
  quantity: number;
  price: number;
  chair?: number | string;
  image?: string;
};

export type PaymentMode = 'cash' | 'upi' | 'card';
export type OrderMode = 'POS' | 'KOT' | 'TAKE AWAY';

export type PaymentRecord = {
  mode: PaymentMode;
  amount: number; // in paise
  timestamp: string; // formatted e.g. "11:25:40 PM"
  tendered?: number; // in paise
  balance?: number; // in paise
  denominations?: Record<number, number>;
  machineNo?: string; // e.g. "POS Machine 1"
  referenceNo?: string; // e.g. "49201" or "-"
};

export type PreviousBill = {
  id: number;
  billNo: string;
  tableNo: string;
  total: number;
  collectedAt: string;
  paidWithCash: boolean;
  paymentMode: string;
  items: Array<{
    name: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
};

export type OrderTab = {
  id: string;
  name: string;
  tableName: string;
  chair: string;
  orderMode: OrderMode;
  lines: EntryLine[];
  gstApplied: boolean;
  payment?: PaymentRecord | null;
};

export interface Pos1HeaderSectionProps {
  topology: InterfaceTopologyController;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onFirstItemPick?: () => void;
  tabs: OrderTab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onCreateTab: () => void;
  onCloseTab: (tabId: string) => void;
  linesCount: number;
  busy: boolean;
  onPrintBill: () => void;
  onSendToKitchen: () => void;
  showOrderTabs?: boolean;
  showKitchenButton?: boolean;
}

export interface Pos1ProductSectionProps {
  topology: InterfaceTopologyController;
  items: CustomMenuItem[];
  selectedItem: CustomMenuItem | null;
  onSelectItem: (item: CustomMenuItem) => void;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  categories: string[];
}

export interface Pos1BillingSectionProps {
  topology: InterfaceTopologyController;
  activeTab: OrderTab;
  tableName: string;
  lines: EntryLine[];
  subtotal: number;
  totalQuantity: number;
  total: number;
  orderMode: OrderMode;
  onChangeOrderMode: (mode: OrderMode) => void;
  onClearUnsavedOrder: () => void;
  onIncrementLine: (lineKey: string) => void;
  onDecrementLine: (lineKey: string) => void;
  onRemoveLine: (lineKey: string) => void;
  formatChair: (table: string, chair: number | string) => string;
  onNextOrder?: () => void;
  nextButtonRef?: RefObject<HTMLButtonElement | null>;
}

export type LastBillNotification = {
  billNo: string;
  total: number;
  paid: boolean;
};

export interface Pos1ManualEntrySectionProps {
  topology: InterfaceTopologyController;
  lastBill?: LastBillNotification;
  itemCode: string;
  itemName: string;
  quantity: string;
  menuItems: CustomMenuItem[];
  onChangeItemCode: (code: string) => void;
  onChangeQuantity: (qty: string) => void;
  onApplyItem: (item: CustomMenuItem) => void;
  onAddToOrder: () => void;
  codeInputRef: RefObject<HTMLInputElement | null>;
  quantityInputRef: RefObject<HTMLInputElement | null>;
}


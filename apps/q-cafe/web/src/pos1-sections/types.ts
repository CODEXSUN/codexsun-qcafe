import type { RefObject } from 'react';
import type { InterfaceTopologyController } from '@codexsun/devkit-ito';
import type { CustomMenuItem, TableMasterConfig } from '../mastersStore';
import type { CafeSettings } from '../Settings';

export type EntryLine = {
  key: string;
  menuId?: number;
  code: string;
  name: string;
  quantity: number;
  price: number;
  chair?: number;
  image?: string;
};

export type PaymentMode = 'cash' | 'upi' | 'card';

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

export type OrderTab = {
  id: string;
  name: string;
  tableName: string;
  chair: string;
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
  onOpenReceiptPreview: () => void;
  onPrintBill: () => void;
  onSendToKitchen: () => void;
  payment?: PaymentRecord | null;
  onFocusPayment?: () => void;
  showPaymentCollector?: boolean;
  onTogglePaymentCollector?: () => void;
}

export interface Pos1ProductSectionProps {
  topology: InterfaceTopologyController;
  items: CustomMenuItem[];
  selectedItem: CustomMenuItem | null;
  onSelectItem: (item: CustomMenuItem) => void;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  standardCategories: string[];
  moreCategories: string[];
  showMoreCategories: boolean;
  onToggleShowMoreCategories: (show: boolean) => void;
}

export interface Pos1BillingSectionProps {
  topology: InterfaceTopologyController;
  activeTab: OrderTab;
  tableName: string;
  lines: EntryLine[];
  subtotal: number;
  totalQuantity: number;
  gstApplied: boolean;
  gstAmount: number;
  total: number;
  cafeSettings: CafeSettings;
  onToggleGst: () => void;
  onIncrementLine: (lineKey: string) => void;
  onDecrementLine: (lineKey: string) => void;
  onRemoveLine: (lineKey: string) => void;
  formatChair: (table: string, chair: number | string) => string;
  onRecordPayment?: (payment: PaymentRecord) => void;
  onClearPayment?: () => void;
  collectorRef?: RefObject<HTMLDivElement | null>;
  showPaymentCollector?: boolean;
  onTogglePaymentCollector?: () => void;
  onClosePaymentCollector?: () => void;
  onNextOrder?: () => void;
  nextButtonRef?: RefObject<HTMLButtonElement | null>;
}

export interface Pos1ManualEntrySectionProps {
  topology: InterfaceTopologyController;
  tableName: string;
  chair: string;
  itemCode: string;
  itemName: string;
  quantity: string;
  rate: string;
  amount?: number;
  tableConfigs: TableMasterConfig[];
  menuItems: CustomMenuItem[];
  tableChairCount: number;
  onSelectTable: (tableNo: string) => void;
  onSelectChair: (chair: string) => void;
  onChangeItemCode: (code: string) => void;
  onChangeItemName: (name: string) => void;
  onChangeQuantity: (qty: string) => void;
  onChangeRate: (rate: string) => void;
  onApplyItem: (item: CustomMenuItem) => void;
  onAddToOrder: () => void;
  formatChair: (table: string, chair: number | string) => string;
  tableInputRef?: RefObject<HTMLInputElement | null>;
  chairInputRef?: RefObject<HTMLInputElement | null>;
  codeInputRef?: RefObject<HTMLInputElement | null>;
  nameInputRef?: RefObject<HTMLInputElement | null>;
  quantityInputRef?: RefObject<HTMLInputElement | null>;
  rateInputRef?: RefObject<HTMLInputElement | null>;
}


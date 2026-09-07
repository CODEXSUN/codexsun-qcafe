import type { RefObject } from 'react';
import type { InterfaceTopologyController } from '@codexsun/devkit-ito';
import type { CustomMenuItem, TableMasterConfig } from '../mastersStore';

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
  billNo: string;
  tableNo: string;
  total: number;
  collectedAt: string;
  paidWithCash: boolean;
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
  showOrderTabs?: boolean;
  showKitchenButton?: boolean;
  onClearUnsavedOrder: () => void;
  previousBillsVisible: boolean;
  previousBillPage: number;
  previousBillPageCount: number;
  onPreviousBillPage: () => void;
  onNextBillPage: () => void;
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
  onIncrementLine: (lineKey: string) => void;
  onDecrementLine: (lineKey: string) => void;
  onRemoveLine: (lineKey: string) => void;
  formatChair: (table: string, chair: number | string) => string;
  onRecordPayment?: (payment: PaymentRecord) => void;
  onClearPayment?: () => void;
  collectorRef?: RefObject<HTMLDivElement | null>;
  showPaymentCollector?: boolean;
  onClosePaymentCollector?: () => void;
  onNextOrder?: () => void;
  nextButtonRef?: RefObject<HTMLButtonElement | null>;
  previousBills: PreviousBill[];
  showCollectedBills: boolean;
  previousBillPage: number;
  previousBillPageCount: number;
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


import { useState, useEffect } from 'react';
import { Store, Receipt, Palette, Server, Check, RotateCcw, HardDrive, FlaskConical, CheckCircle2, AlertCircle, Sparkles, Sliders, Download, RefreshCw } from 'lucide-react';
import { Button } from '@codexsun/ui/components/ui/button';
import type { InterfaceTopologyController } from '@codexsun/devkit-ito';
import { type Snapshot } from './api';
import { field } from './Workspaces';
import { ItoRegion } from './ItoRegion';
import {
  DEMO_10_ITEMS,
  installDemoItemsAndImages,
  verifyImageStorageFolder,
  type StorageVerificationResult,
} from './mastersStore';

export type CafeSettings = {
  restaurantName: string;
  branchName: string;
  contactNumber: string;
  address?: string;
  fssai?: string;
  receiptHeader: string;
  receiptFooter: string;
  defaultServiceType: 'Dine-in' | 'Takeaway';
  defaultGstRate: number;
  gstin: string;
  currency: string;
  autoPrintBill: boolean;
  theme: 'system' | 'light' | 'dark';
  showItoIcon: boolean;
  imageFolderPath?: string;
  imageWriteProtection?: boolean;

  // Screen Feature & Navigation Toggles
  showOrderTabs?: boolean;
  showKitchenButton?: boolean;
  showNavKitchen?: boolean;
  showNavInventory?: boolean;
  showNavBookings?: boolean;
  showNavDashboard?: boolean;
  showNavMasters?: boolean;
};

const DEFAULT_SETTINGS: CafeSettings = {
  restaurantName: 'Q Cafe',
  branchName: 'Main Floor',
  contactNumber: '+91 98765 43210',
  address: '12/4 North Boulevard, Anna Nagar, Chennai - 600040',
  fssai: '12423001000456',
  receiptHeader: 'Artisanal Coffee & Kitchen',
  receiptFooter: 'Thank you for dining with us! Please visit again.',
  defaultServiceType: 'Dine-in',
  defaultGstRate: 5,
  gstin: '33AAAAA0000A1Z5',
  currency: 'INR (₹)',
  autoPrintBill: false,
  theme: 'system',
  showItoIcon: false,
  imageFolderPath: 'C:\\q-cafe\\images',
  imageWriteProtection: false,

  // Screen Feature & Navigation Toggles default to false (all hidden by default)
  showOrderTabs: false,
  showKitchenButton: false,
  showNavKitchen: false,
  showNavInventory: false,
  showNavBookings: false,
  showNavDashboard: false,
  showNavMasters: false,
};

const STORAGE_KEY = 'q-cafe-settings';
const ITO_EXPLICIT_KEY = 'q-cafe-ito-explicitly-enabled';

export function loadSettings(): CafeSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    const explicitlyEnabled = localStorage.getItem(ITO_EXPLICIT_KEY) === 'true';
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      showOrderTabs: Boolean(parsed.showOrderTabs),
      showKitchenButton: Boolean(parsed.showKitchenButton),
      showNavKitchen: Boolean(parsed.showNavKitchen),
      showNavInventory: Boolean(parsed.showNavInventory),
      showNavBookings: Boolean(parsed.showNavBookings),
      showNavDashboard: Boolean(parsed.showNavDashboard),
      showNavMasters: Boolean(parsed.showNavMasters),
      showItoIcon: explicitlyEnabled ? Boolean(parsed.showItoIcon) : false,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function applyTheme(theme: 'system' | 'light' | 'dark') {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark);
}

export function saveSettings(settings: CafeSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage quota errors ignored
  }
}

type Props = {
  data: Snapshot;
  topology: InterfaceTopologyController;
  showItoIcon?: boolean;
  onToggleItoIcon?: (show: boolean) => void;
};

type TabId = 'general' | 'features' | 'pos' | 'media' | 'appearance' | 'system';

export function Settings({ data, topology, onToggleItoIcon }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [settings, setSettings] = useState<CafeSettings>(() => loadSettings());
  const [savedNotice, setSavedNotice] = useState(false);
  const [verificationResult, setVerificationResult] = useState<StorageVerificationResult | null>(null);
  const [demoInstallNotice, setDemoInstallNotice] = useState('');
  const [availableUpdate, setAvailableUpdate] = useState<{ version: string; notes: string } | null>(null);
  const [currentVersion, setCurrentVersion] = useState('1.1.2');
  const [updateState, setUpdateState] = useState<'idle' | 'checking' | 'current' | 'available' | 'error'>('idle');
  const [updateBusy, setUpdateBusy] = useState(false);
  const [updateNotice, setUpdateNotice] = useState('');

  useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window)) return;
    void import('@tauri-apps/api/app')
      .then(({ getVersion }) => getVersion())
      .then(setCurrentVersion)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!savedNotice) return;
    const timeout = setTimeout(() => setSavedNotice(false), 2400);
    return () => clearTimeout(timeout);
  }, [savedNotice]);

  function handleChange<K extends keyof CafeSettings>(key: K, value: CafeSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
    if (key === 'theme') {
      applyTheme(value as CafeSettings['theme']);
    }
  }

  function handleToggleFeature<K extends keyof CafeSettings>(key: K, visible: boolean) {
    handleChange(key, visible as CafeSettings[K]);
    const updated = { ...settings, [key]: visible };
    saveSettings(updated);
    window.dispatchEvent(new CustomEvent('q-cafe-settings-updated', { detail: updated }));
  }

  function handleSetAllFeatures(visible: boolean) {
    const updated: CafeSettings = {
      ...settings,
      showOrderTabs: visible,
      showKitchenButton: visible,
      showNavKitchen: visible,
      showNavInventory: visible,
      showNavBookings: visible,
      showNavDashboard: visible,
      showNavMasters: visible,
    };
    setSettings(updated);
    saveSettings(updated);
    window.dispatchEvent(new CustomEvent('q-cafe-settings-updated', { detail: updated }));
    setSavedNotice(true);
  }

  function handleToggleIto(visible: boolean) {
    handleChange('showItoIcon', visible);
    const updated = { ...settings, showItoIcon: visible };
    saveSettings(updated);
    if (visible) {
      localStorage.setItem(ITO_EXPLICIT_KEY, 'true');
    } else {
      localStorage.removeItem(ITO_EXPLICIT_KEY);
    }
    window.dispatchEvent(new CustomEvent('q-cafe-settings-updated', { detail: updated }));
    if (onToggleItoIcon) onToggleItoIcon(visible);
  }

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (settings.showItoIcon) {
      localStorage.setItem(ITO_EXPLICIT_KEY, 'true');
    } else {
      localStorage.removeItem(ITO_EXPLICIT_KEY);
    }
    saveSettings(settings);
    applyTheme(settings.theme);
    window.dispatchEvent(new CustomEvent('q-cafe-settings-updated', { detail: settings }));
    if (onToggleItoIcon) onToggleItoIcon(settings.showItoIcon);
    setSavedNotice(true);
  }

  function handleReset() {
    localStorage.removeItem(ITO_EXPLICIT_KEY);
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
    applyTheme(DEFAULT_SETTINGS.theme);
    window.dispatchEvent(new CustomEvent('q-cafe-settings-updated', { detail: DEFAULT_SETTINGS }));
    if (onToggleItoIcon) onToggleItoIcon(DEFAULT_SETTINGS.showItoIcon);
    setSavedNotice(true);
    setVerificationResult(null);
  }

  function handleTestFolder() {
    const result = verifyImageStorageFolder(
      settings.imageFolderPath ?? 'C:\\q-cafe\\images',
      Boolean(settings.imageWriteProtection)
    );
    setVerificationResult(result);
  }

  function handleInstallDemo() {
    const res = installDemoItemsAndImages();
    setDemoInstallNotice(`Successfully installed ${res.count} demo menu items with high-resolution offline images!`);
    setTimeout(() => setDemoInstallNotice(''), 4000);
  }

  function updaterErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return fallback;
  }

  async function checkForUpdate() {
    if (!('__TAURI_INTERNALS__' in window)) {
      setUpdateNotice('Updates are available from the Q Cafe Windows application.');
      return;
    }
    setUpdateBusy(true);
    setAvailableUpdate(null);
    setUpdateNotice('');
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const update = await invoke<{ version: string; notes: string } | null>('qcafe_check_for_update');
      setAvailableUpdate(update);
      setUpdateNotice(update ? `Q Cafe ${update.version} is ready to install.` : 'Q Cafe is up to date.');
    } catch (error) {
      setUpdateNotice(updaterErrorMessage(error, 'Q Cafe could not check for updates.'));
    } finally {
      setUpdateBusy(false);
    }
  }

  async function installUpdate() {
    setUpdateBusy(true);
    setUpdateNotice('Downloading and verifying the Q Cafe installer…');
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('qcafe_install_update');
    } catch (error) {
      setUpdateBusy(false);
      setUpdateNotice(updaterErrorMessage(error, 'Q Cafe could not install the update.'));
    }
  }

  const tabs: { id: TabId; label: string; icon: typeof Store }[] = [
    { id: 'general', label: 'General & Profile', icon: Store },
    { id: 'features', label: 'Features & Toggles', icon: Sliders },
    { id: 'pos', label: 'POS & Billing', icon: Receipt },
    { id: 'media', label: 'Image Storage & Media', icon: HardDrive },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'system', label: 'System & Runtime', icon: Server },
  ];

  return (
    <ItoRegion id="q11" topology={topology} className="space-y-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Navigation Tabs */}
        <ItoRegion
          id="q11.1"
          topology={topology}
          tag="section"
          className="flex flex-row gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1.5 lg:w-60 lg:shrink-0 lg:flex-col"
        >
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'bg-accent text-accent-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
              }`}
            >
              <Icon size={17} className="shrink-0" />
              <span className="whitespace-nowrap">{label}</span>
            </button>
          ))}
        </ItoRegion>

        {/* Configuration Panel */}
        <div className="min-w-0 flex-1">
          <form onSubmit={handleSave} className="space-y-6">
            <ItoRegion
              id="q11.2"
              topology={topology}
              className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-xs"
            >
              {activeTab === 'general' && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">Restaurant Profile</h2>
                    <p className="text-sm text-muted-foreground">
                      Manage restaurant information and public receipt branding.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-1.5 text-sm font-medium">
                      Restaurant Name
                      <input
                        className={field}
                        value={settings.restaurantName}
                        onChange={(e) => handleChange('restaurantName', e.target.value)}
                        placeholder="e.g. Q Cafe"
                        required
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium">
                      Branch / Counter Name
                      <input
                        className={field}
                        value={settings.branchName}
                        onChange={(e) => handleChange('branchName', e.target.value)}
                        placeholder="e.g. Main Floor"
                      />
                    </label>
                  </div>

                  <label className="grid gap-1.5 text-sm font-medium">
                    Address / Location
                    <input
                      className={field}
                      value={settings.address ?? ''}
                      onChange={(e) => handleChange('address', e.target.value)}
                      placeholder="e.g. 12/4 North Boulevard, Anna Nagar, Chennai - 600040"
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-1.5 text-sm font-medium">
                      Contact Number
                      <input
                        className={field}
                        value={settings.contactNumber}
                        onChange={(e) => handleChange('contactNumber', e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium">
                      Display Currency
                      <select
                        className={`${field} cursor-pointer`}
                        value={settings.currency}
                        onChange={(e) => handleChange('currency', e.target.value)}
                      >
                        <option value="INR (₹)">INR (₹) - Indian Rupee</option>
                        <option value="USD ($)">USD ($) - US Dollar</option>
                        <option value="EUR (€)">EUR (€) - Euro</option>
                        <option value="GBP (£)">GBP (£) - British Pound</option>
                      </select>
                    </label>
                  </div>

                  <div className="border-t border-border pt-4">
                    <ItoIconToggleCard
                      checked={settings.showItoIcon}
                      onToggle={handleToggleIto}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'features' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
                        <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
                          <Sliders size={16} />
                        </span>
                        Screen Features & Navigation Toggles
                      </h2>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Enable or disable header actions, order tabs, and workspace navigation items across screens.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSetAllFeatures(false)}
                        className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer transition-colors shadow-2xs"
                      >
                        Hide All
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetAllFeatures(true)}
                        className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer transition-colors shadow-2xs"
                      >
                        Show All
                      </button>
                    </div>
                  </div>

                  {/* POS 1 Header Elements */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      POS Top Header Elements
                    </h3>
                    <div className="grid gap-3">
                      <FeatureToggleCard
                        title="Tab Order (Multi-Order Tabs)"
                        description="Show or hide the order tabs ('Order 1', 'Order 2') and '+ New Order' button in the POS 1 top header."
                        checked={Boolean(settings.showOrderTabs)}
                        onToggle={(v) => handleToggleFeature('showOrderTabs', v)}
                        badge="POS Header"
                      />
                      <FeatureToggleCard
                        title="Send to Kitchen Button"
                        description="Show or hide the 'Kitchen (F4)' order dispatch button in the POS 1 top header."
                        checked={Boolean(settings.showKitchenButton)}
                        onToggle={(v) => handleToggleFeature('showKitchenButton', v)}
                        badge="POS Header"
                      />
                    </div>
                  </div>

                  {/* Sidebar Navigation Items */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Sidebar Navigation Workspaces
                    </h3>
                    <div className="grid gap-3">
                      <FeatureToggleCard
                        title="Kitchen Workspace"
                        description="Display the Kitchen live order preparation screen in the left navigation sidebar."
                        checked={Boolean(settings.showNavKitchen)}
                        onToggle={(v) => handleToggleFeature('showNavKitchen', v)}
                        badge="Sidebar"
                      />
                      <FeatureToggleCard
                        title="Inventory Workspace"
                        description="Display the Stock and Inventory management workspace in the left navigation sidebar."
                        checked={Boolean(settings.showNavInventory)}
                        onToggle={(v) => handleToggleFeature('showNavInventory', v)}
                        badge="Sidebar"
                      />
                      <FeatureToggleCard
                        title="Bookings Workspace"
                        description="Display the Table reservations and guest bookings screen in the left navigation sidebar."
                        checked={Boolean(settings.showNavBookings)}
                        onToggle={(v) => handleToggleFeature('showNavBookings', v)}
                        badge="Sidebar"
                      />
                      <FeatureToggleCard
                        title="Dashboard Workspace"
                        description="Display the Service overview dashboard workspace in the left navigation sidebar."
                        checked={Boolean(settings.showNavDashboard)}
                        onToggle={(v) => handleToggleFeature('showNavDashboard', v)}
                        badge="Sidebar"
                      />
                      <FeatureToggleCard
                        title="Masters Workspace"
                        description="Display the Menu item and table master configuration in the left navigation sidebar."
                        checked={Boolean(settings.showNavMasters)}
                        onToggle={(v) => handleToggleFeature('showNavMasters', v)}
                        badge="Sidebar"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'pos' && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">Point of Sale & Billing</h2>
                    <p className="text-sm text-muted-foreground">
                      Configure cashier defaults, tax rates, and bill notes.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-1.5 text-sm font-medium">
                      Default Service Type
                      <select
                        className={`${field} cursor-pointer`}
                        value={settings.defaultServiceType}
                        onChange={(e) =>
                          handleChange('defaultServiceType', e.target.value as 'Dine-in' | 'Takeaway')
                        }
                      >
                        <option value="Dine-in">Dine-in (Default Table T01)</option>
                        <option value="Takeaway">Takeaway</option>
                      </select>
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium">
                      GST Rate (%)
                      <select
                        className={`${field} cursor-pointer`}
                        value={settings.defaultGstRate}
                        onChange={(e) => handleChange('defaultGstRate', Number(e.target.value))}
                      >
                        <option value={0}>0% - Exempted</option>
                        <option value={5}>5% - Food & Beverages</option>
                        <option value={12}>12% - Standard Catering</option>
                        <option value={18}>18% - Premium Dine-in</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-1.5 text-sm font-medium">
                      GSTIN / Tax Registration Number
                      <input
                        className={field}
                        value={settings.gstin}
                        onChange={(e) => handleChange('gstin', e.target.value)}
                        placeholder="e.g. 33AAAAA0000A1Z5"
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium">
                      FSSAI License Number
                      <input
                        className={field}
                        value={settings.fssai ?? ''}
                        onChange={(e) => handleChange('fssai', e.target.value)}
                        placeholder="e.g. 12423001000456"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-1.5 text-sm font-medium">
                      Receipt Header Message
                      <input
                        className={field}
                        value={settings.receiptHeader}
                        onChange={(e) => handleChange('receiptHeader', e.target.value)}
                        placeholder="Welcome note on printed bill"
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium">
                      Receipt Footer Note
                      <input
                        className={field}
                        value={settings.receiptFooter}
                        onChange={(e) => handleChange('receiptFooter', e.target.value)}
                        placeholder="Thank you note on bill"
                      />
                    </label>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-muted/40 p-4 text-xs text-muted-foreground">
                    <h3 className="font-semibold text-foreground text-sm mb-1">Keyboard-first POS Shortcuts</h3>
                    <ul className="grid gap-1.5 sm:grid-cols-2">
                      <li><kbd className="font-mono bg-background border px-1.5 py-0.5 rounded text-foreground">Enter</kbd> : Jump to next input or add item</li>
                      <li><kbd className="font-mono bg-background border px-1.5 py-0.5 rounded text-foreground">Esc</kbd> : Step back to previous input field</li>
                      <li><kbd className="font-mono bg-background border px-1.5 py-0.5 rounded text-foreground">F8</kbd> : Print current bill immediately</li>
                      <li><kbd className="font-mono bg-background border px-1.5 py-0.5 rounded text-foreground">Ctrl + K</kbd> : Open global search palette</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'media' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
                      <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
                        <HardDrive size={16} />
                      </span>
                      Image Storage & File Permissions
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Configure your system image directory, manage write protection locks, and install bundled demo photos for offline use.
                    </p>
                  </div>

                  {/* Folder Configuration */}
                  <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-semibold text-foreground flex items-center justify-between">
                        <span>Image Storage Folder Path</span>
                        <span className="text-xs font-normal text-muted-foreground">User can keep anywhere on system</span>
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Directory on this PC or network drive where item photos and uploaded images are stored.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <input
                          className={`${field} w-full font-mono text-xs`}
                          value={settings.imageFolderPath ?? 'C:\\q-cafe\\images'}
                          onChange={(e) => handleChange('imageFolderPath', e.target.value)}
                          placeholder="e.g. C:\q-cafe\images or D:\CafeData\Images"
                          required
                        />
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleTestFolder}
                        className="cursor-pointer gap-2 shrink-0 border-primary/40 hover:border-primary hover:bg-primary/5 text-primary text-xs font-semibold h-10 px-4"
                        title="Verify folder path and read/write permission"
                      >
                        <FlaskConical size={15} className="stroke-[2.2]" />
                        <span>Test & Verify Folder</span>
                      </Button>
                    </div>

                    {verificationResult && (
                      <div
                        className={`flex items-start gap-3 rounded-xl border p-3.5 text-xs transition-all ${
                          verificationResult.ok
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                            : 'border-destructive/30 bg-destructive/10 text-destructive'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {verificationResult.ok ? (
                            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <AlertCircle size={16} className="text-destructive" />
                          )}
                        </div>
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold uppercase tracking-wider text-[10px]">
                              {verificationResult.ok ? '✓ Folder Storage Status: Verified' : '✕ Verification Issue'}
                            </span>
                            <span className="text-[10px] opacity-75">{verificationResult.timestamp}</span>
                          </div>
                          <p className="font-medium leading-relaxed">{verificationResult.message}</p>
                          <div className="flex flex-wrap gap-2 pt-1 font-mono text-[10px]">
                            <span className="rounded bg-background/60 px-1.5 py-0.5 border border-border/50">
                              Target: {verificationResult.folderPath}
                            </span>
                            <span className="rounded bg-background/60 px-1.5 py-0.5 border border-border/50">
                              Mode: {verificationResult.isWriteProtected ? 'Locked (Write-Protected)' : 'Writable (Read & Write)'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Write Protection Permission */}
                  <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">Write Protection Permission</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            settings.imageWriteProtection
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {settings.imageWriteProtection ? 'Protected / Read-Only' : 'Writable / Editable'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        When write protection is enabled, existing images and item assets cannot be overwritten or deleted without administrative bypass. Turn this on after setting up your menu to lock images safely.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(settings.imageWriteProtection)}
                        aria-label="Toggle write protection permission for images"
                        onClick={() => handleChange('imageWriteProtection', !settings.imageWriteProtection)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          settings.imageWriteProtection ? 'bg-amber-500' : 'bg-muted-foreground/30'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            settings.imageWriteProtection ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Bundled Demo Media (10 Items) */}
                  <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3">
                      <div className="space-y-0.5">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Sparkles size={15} className="text-primary" />
                          Bundled Offline Demo Images (10 Items)
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Install 10 packaged cafe food & drink illustrations directly into your catalog so images show immediately without internet.
                        </p>
                      </div>

                      <Button
                        type="button"
                        onClick={handleInstallDemo}
                        className="cursor-pointer gap-2 shrink-0 text-xs font-semibold h-9"
                      >
                        <Sparkles size={14} />
                        <span>Install 10 Demo Items & Images</span>
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
                      {DEMO_10_ITEMS.map((item) => (
                        <div
                          key={item.code}
                          className="flex flex-col rounded-xl border border-border bg-muted/30 p-2 text-center overflow-hidden hover:border-primary/40 transition-colors"
                        >
                          <div className="aspect-video w-full rounded-lg bg-black/10 overflow-hidden mb-1.5 border border-border/40">
                            <img src={item.image} alt={item.name} className="size-full object-cover" />
                          </div>
                          <span className="text-[11px] font-bold text-foreground truncate">{item.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{item.code} · ₹{(item.price / 100).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>

                    {demoInstallNotice && (
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-200 font-medium flex items-center gap-2">
                        <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{demoInstallNotice}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">Appearance & Theme</h2>
                    <p className="text-sm text-muted-foreground">
                      Choose your interface appearance and layout density preferences.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { id: 'system', label: 'System Default', desc: 'Sync with OS setting' },
                      { id: 'light', label: 'Light Theme', desc: 'Clean high-contrast daylight' },
                      { id: 'dark', label: 'Dark Theme', desc: 'Lower eye strain for night shifts' },
                    ].map(({ id, label, desc }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handleChange('theme', id as CafeSettings['theme'])}
                        className={`flex cursor-pointer flex-col rounded-xl border p-4 text-left transition-all ${
                          settings.theme === id
                            ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary'
                            : 'border-border bg-card hover:bg-accent/40 text-muted-foreground'
                        }`}
                      >
                        <span className="font-medium text-foreground text-sm">{label}</span>
                        <span className="mt-1 text-xs">{desc}</span>
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-border pt-4">
                    <ItoIconToggleCard
                      checked={settings.showItoIcon}
                      onToggle={handleToggleIto}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'system' && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">System, Database & Runtime</h2>
                    <p className="text-sm text-muted-foreground">
                      Technical runtime details and offline-first database synchronization foundation.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <article className="rounded-xl border border-border bg-muted/20 p-4">
                      <span className="text-xs text-muted-foreground block">Application Host</span>
                      <strong className="text-sm font-semibold">
                        {'__TAURI_INTERNALS__' in window ? 'Tauri Desktop (Windows)' : 'Web Client (Vite)'}
                      </strong>
                    </article>

                    <article className="rounded-xl border border-border bg-muted/20 p-4">
                      <span className="text-xs text-muted-foreground block">Database Mode</span>
                      <strong className="text-sm font-semibold">
                        {data.demo ? 'Local SQLite (Demo Seeded)' : 'Local SQLite (Persistent)'}
                      </strong>
                    </article>

                    <article className="rounded-xl border border-border bg-muted/20 p-4">
                      <span className="text-xs text-muted-foreground block">Restaurant Floor Capacity</span>
                      <strong className="text-sm font-semibold">12 Tables (T01 - T12)</strong>
                    </article>

                    <article className="rounded-xl border border-border bg-muted/20 p-4">
                      <span className="text-xs text-muted-foreground block">Active Menu Catalog</span>
                      <strong className="text-sm font-semibold">{data.menu.length} registered items</strong>
                    </article>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground space-y-1">
                    <span className="font-semibold text-foreground text-sm block">Cloud Sync Foundation</span>
                    <p>
                      Every local restaurant order, booking, and inventory adjustment includes unique <code className="text-xs">sync_id</code> and version timestamps. The API provides transactional resilience for standalone counter execution.
                    </p>
                  </div>

                  <div className={`rounded-xl border p-4 ${updateState === 'available' ? 'border-orange-500/60 bg-orange-500/10' : updateState === 'current' ? 'border-emerald-500/60 bg-emerald-500/5' : updateState === 'error' ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-muted/20'}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">Q Cafe updates</h3>
                        <p className="mt-1 text-xs text-muted-foreground">Checks the verified stable release only when you select Check now.</p>
                        <p className={`mt-2 text-xs font-medium ${updateState === 'available' ? 'text-orange-700 dark:text-orange-300' : updateState === 'current' ? 'text-emerald-700 dark:text-emerald-300' : updateState === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {availableUpdate ? `Update available: v${availableUpdate.version}` : updateState === 'current' ? `Current version: v${currentVersion}` : `Installed version: v${currentVersion}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" disabled={updateBusy} onClick={() => void checkForUpdate()} className="cursor-pointer gap-1.5 border-current/20 bg-background/70 hover:bg-background">
                          <RefreshCw size={14} className={updateBusy ? 'animate-spin' : ''} />
                          Check now
                        </Button>
                        {availableUpdate && <Button type="button" size="sm" disabled={updateBusy} onClick={() => void installUpdate()} className="cursor-pointer gap-1.5 bg-orange-600 text-white hover:bg-orange-700">
                          <Download size={14} />
                          Install v{availableUpdate.version}
                        </Button>}
                      </div>
                    </div>
                    {updateNotice && <p className={`mt-3 text-xs ${updateState === 'available' ? 'text-orange-800 dark:text-orange-200' : updateState === 'current' ? 'text-emerald-800 dark:text-emerald-200' : updateState === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>{updateNotice}</p>}
                  </div>

                  <div className="pt-2">
                    <ItoIconToggleCard
                      checked={settings.showItoIcon}
                      onToggle={handleToggleIto}
                    />
                  </div>
                </div>
              )}
            </ItoRegion>

            {/* Bottom Actions Bar */}
            <ItoRegion
              id="q11.3"
              topology={topology}
              className="flex items-center justify-between gap-4 pt-2"
            >
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="cursor-pointer gap-2"
              >
                <RotateCcw size={15} />
                Reset defaults
              </Button>

              <div className="flex items-center gap-3">
                {savedNotice && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <Check size={14} className="stroke-[2.5]" />
                    Settings saved
                  </span>
                )}
                <Button type="submit" className="cursor-pointer">
                  Save changes
                </Button>
              </div>
            </ItoRegion>
          </form>
        </div>
      </div>
    </ItoRegion>
  );
}

function ItoIconToggleCard({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">ITO / IOT Inspection Icon</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            DevKit Overlay
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Show or hide the floating purple ITO interface topology inspector button in the bottom right corner.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={`text-xs font-semibold uppercase tracking-wider ${
            checked ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          {checked ? 'Showing' : 'Hidden'}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label="Show or hide ITO inspection icon"
          onClick={() => onToggle(!checked)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            checked ? 'bg-primary' : 'bg-muted-foreground/30'
          }`}
        >
          <span className="sr-only">Show or hide ITO inspection icon</span>
          <span
            className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
              checked ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
}

function FeatureToggleCard({
  title,
  description,
  checked,
  onToggle,
  badge,
}: {
  title: string;
  description: string;
  checked: boolean;
  onToggle: (next: boolean) => void;
  badge?: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card hover:bg-accent/15 p-4 sm:flex-row sm:items-center sm:justify-between transition-colors">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {badge && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span
          className={`text-xs font-semibold uppercase tracking-wider ${
            checked ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
          }`}
        >
          {checked ? 'Visible' : 'Hidden'}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={`Toggle ${title}`}
          onClick={() => onToggle(!checked)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            checked ? 'bg-emerald-600' : 'bg-muted-foreground/30'
          }`}
        >
          <span className="sr-only">Toggle {title}</span>
          <span
            className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
              checked ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
}

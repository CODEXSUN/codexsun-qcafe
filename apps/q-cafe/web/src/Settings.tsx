import { useState, useEffect } from 'react';
import { Store, Receipt, Palette, Server, Check, RotateCcw } from 'lucide-react';
import { Button } from '@codexsun/ui/components/ui/button';
import type { InterfaceTopologyController } from '@codexsun/devkit-ito';
import { type Snapshot } from './api';
import { field } from './Workspaces';
import { ItoRegion } from './ItoRegion';

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
  showItoIcon: true,
};

const STORAGE_KEY = 'q-cafe-settings';

export function loadSettings(): CafeSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
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

type TabId = 'general' | 'pos' | 'appearance' | 'system';

export function Settings({ data, topology, onToggleItoIcon }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [settings, setSettings] = useState<CafeSettings>(() => loadSettings());
  const [savedNotice, setSavedNotice] = useState(false);

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

  function handleToggleIto(visible: boolean) {
    handleChange('showItoIcon', visible);
    const updated = { ...settings, showItoIcon: visible };
    saveSettings(updated);
    window.dispatchEvent(new CustomEvent('q-cafe-settings-updated', { detail: updated }));
    if (onToggleItoIcon) onToggleItoIcon(visible);
  }

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    saveSettings(settings);
    applyTheme(settings.theme);
    window.dispatchEvent(new CustomEvent('q-cafe-settings-updated', { detail: settings }));
    if (onToggleItoIcon) onToggleItoIcon(settings.showItoIcon);
    setSavedNotice(true);
  }

  function handleReset() {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
    applyTheme(DEFAULT_SETTINGS.theme);
    window.dispatchEvent(new CustomEvent('q-cafe-settings-updated', { detail: DEFAULT_SETTINGS }));
    if (onToggleItoIcon) onToggleItoIcon(DEFAULT_SETTINGS.showItoIcon);
    setSavedNotice(true);
  }

  const tabs: { id: TabId; label: string; icon: typeof Store }[] = [
    { id: 'general', label: 'General & Profile', icon: Store },
    { id: 'pos', label: 'POS & Billing', icon: Receipt },
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


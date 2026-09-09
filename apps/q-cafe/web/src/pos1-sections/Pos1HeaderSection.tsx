import { Plus, Printer, Search, Send, X } from 'lucide-react';
import { TopologyMarker } from '@codexsun/devkit-ito';
import type { Pos1HeaderSectionProps } from './types';

export function Pos1HeaderSection({
  topology,
  searchQuery,
  onSearchChange,
  searchInputRef,
  onFirstItemPick,
  tabs,
  activeTabId,
  onSelectTab,
  onCreateTab,
  onCloseTab,
  linesCount,
  busy,
  onPrintBill,
  onSendToKitchen,
  showOrderTabs = false,
  showKitchenButton = false,
}: Pos1HeaderSectionProps) {
  return (
    <header
      className="ito-region relative z-30 shrink-0 border-b border-border bg-card px-3.5 py-2 shadow-2xs flex items-center justify-between gap-3 overflow-visible print:hidden"
      {...topology.regionProps('q12.1')}
    >
      <TopologyMarker id="q12.1" topology={topology} />

      {/* Left: Search input + Order Tabs directly after search (Scroll buttons removed with no-scrollbar) */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-x-auto no-scrollbar py-0.5">
        {/* Search Input (reduced width, aligned left with Tooltip) */}
        <div className="relative group shrink-0">
          <div className="relative flex w-60 sm:w-72 md:w-80 items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5 shadow-2xs">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              aria-label="Search items or scan barcode (F2)"
              className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              placeholder="Search items (e.g. Cappuccino) or scan..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  onSearchChange('');
                  searchInputRef.current?.blur();
                }
                if (e.key === 'Enter' && onFirstItemPick) {
                  e.preventDefault();
                  onFirstItemPick();
                  requestAnimationFrame(() => {
                    searchInputRef.current?.focus();
                    searchInputRef.current?.select();
                  });
                }
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="grid size-5 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
            <kbd className="font-mono text-[10px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border select-none">
              F2
            </kbd>
          </div>

          {/* Search Tooltip */}
          <div className="pointer-events-none absolute left-0 top-[calc(100%+0.35rem)] z-50 whitespace-nowrap rounded-lg border border-border bg-popover px-2.5 py-1 text-[11px] font-medium text-popover-foreground opacity-0 shadow-lg transition-all duration-150 group-focus-within:hidden group-hover:opacity-100 flex items-center gap-1.5">
            <span>Search items</span>
            <kbd className="font-mono text-[10px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border">
              F2
            </kbd>
          </div>
        </div>

        {/* Order Tabs (Immediately after search on left) */}
        {Boolean(showOrderTabs) && (
          <div className="flex items-center gap-1.5 shrink-0">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              const count = tab.lines.reduce((s, l) => s + l.quantity, 0);
              return (
                <div key={tab.id} className="relative group shrink-0">
                  <div
                    onClick={() => onSelectTab(tab.id)}
                    className={`flex items-center gap-2 cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'border border-border bg-muted/30 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <span>{tab.name}</span>
                    {count > 0 && (
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                          isActive
                            ? 'bg-white text-blue-600'
                            : 'bg-background text-foreground border border-border'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                    {tabs.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCloseTab(tab.id);
                        }}
                        className={`grid size-4 place-items-center rounded hover:bg-black/20 ${
                          isActive ? 'text-white' : 'text-muted-foreground hover:text-foreground'
                        }`}
                        aria-label={`Close ${tab.name}`}
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>

                  {/* Tab Tooltip */}
                  <div className="pointer-events-none absolute left-0 top-[calc(100%+0.35rem)] z-50 whitespace-nowrap rounded-lg border border-border bg-popover px-2.5 py-1 text-[11px] font-medium text-popover-foreground opacity-0 shadow-lg transition-all duration-150 group-hover:opacity-100 flex items-center gap-1.5">
                    <span>
                      {tab.name} • Table {tab.tableName}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* New Order Button with Tooltip */}
            <div className="relative group shrink-0">
              <button
                type="button"
                onClick={onCreateTab}
                aria-label="New order tab (F9)"
                className="flex h-7 cursor-pointer items-center gap-1 rounded-xl border border-dashed border-border px-2.5 text-xs font-medium text-muted-foreground hover:border-primary hover:bg-accent hover:text-foreground transition-colors"
              >
                <Plus size={13} />
                <span>New Order</span>
              </button>
              <div className="pointer-events-none absolute left-0 top-[calc(100%+0.35rem)] z-50 whitespace-nowrap rounded-lg border border-border bg-popover px-2.5 py-1 text-[11px] font-medium text-popover-foreground opacity-0 shadow-lg transition-all duration-150 group-hover:opacity-100 flex items-center gap-1.5">
                <span>New order tab</span>
                <kbd className="font-mono text-[10px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border">
                  F9
                </kbd>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right: Current-order actions. Collected bills and settlement are in the right drawer. */}
      <div className="flex items-center gap-2 shrink-0">
        {/* 1. Kitchen Button (with Kitchen label, Send icon, and F4 shortcut key) */}
        {Boolean(showKitchenButton) && (
          <div className="relative group shrink-0">
            <button
              type="button"
              onClick={onSendToKitchen}
              disabled={!linesCount || busy}
              aria-label="Send to kitchen (F4)"
              className="flex items-center gap-1.5 rounded-xl bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 px-3 py-1.5 text-xs font-semibold shadow-xs hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              <Send size={13} />
              <span>Kitchen</span>
              <kbd className="font-mono text-[10px] font-semibold bg-white/20 text-white dark:bg-black/20 dark:text-neutral-900 px-1.5 py-0.5 rounded select-none">
                F4
              </kbd>
            </button>
            <div className="pointer-events-none absolute right-0 top-[calc(100%+0.35rem)] z-50 whitespace-nowrap rounded-lg border border-border bg-popover px-2.5 py-1 text-[11px] font-medium text-popover-foreground opacity-0 shadow-lg transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 flex items-center gap-1.5">
              <span>Send order to kitchen</span>
              <kbd className="font-mono text-[10px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border">
                F4
              </kbd>
            </div>
          </div>
        )}

        {/* Save Button (last with print icon and F8 shortcut key). */}
        <div className="relative group shrink-0">
          <button
            type="button"
            onClick={onPrintBill}
            disabled={!linesCount || busy}
            aria-label="Save and print bill (F8)"
            className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <Printer size={13} />
            <span>Save</span>
            <kbd className="font-mono text-[10px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border select-none">
              F8
            </kbd>
          </button>
          <div className="pointer-events-none absolute right-0 top-[calc(100%+0.35rem)] z-50 whitespace-nowrap rounded-lg border border-border bg-popover px-2.5 py-1 text-[11px] font-medium text-popover-foreground opacity-0 shadow-lg transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 flex items-center gap-1.5">
            <span>Save and print bill</span>
            <kbd className="font-mono text-[10px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border">
              F8
            </kbd>
          </div>
        </div>
      </div>
    </header>
  );
}

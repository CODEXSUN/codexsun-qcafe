import { useEffect, useMemo, useState } from 'react';
import {
  Armchair,
  Clock,
  Coffee,
  CookingPot,
  Minus,
  Plus,
  Receipt,
  RotateCcw,
  Sparkles,
  Users,
  Utensils,
} from 'lucide-react';
import type { InterfaceTopologyController } from '@codexsun/devkit-ito';
import { money, type Snapshot } from './api';
import { ItoRegion } from './ItoRegion';
import { getMergedTables, type TableMasterConfig } from './mastersStore';

type Props = {
  data: Snapshot;
  navigate: (page: string) => void;
  topology: InterfaceTopologyController;
  onSelectTable?: (tableNo: string, chairCount: number) => void;
};

// Chair preset options for touch selector
const CHAIR_PRESETS = [1, 2, 3, 4, 5, 6, 8, 10];

export function Tables({ data, navigate, topology, onSelectTable }: Props) {
  const [selectedChairs, setSelectedChairs] = useState<number>(4);
  const [filter, setFilter] = useState<'all' | 'available' | 'occupied' | 'parcel'>('all');
  const [now, setNow] = useState<number>(() => Date.now());

  // Live timer for rolling duration tickers (updates every 15 seconds)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const tables = useMemo<TableMasterConfig[]>(() => {
    return getMergedTables(data.restaurant_tables);
  }, [data.restaurant_tables]);

  // Active kitchen orders (unserved)
  const activeOrders = useMemo(() => {
    return data.orders.filter((o) => o.status !== 'served');
  }, [data.orders]);

  // Open or part-paid POS bills
  const openBills = useMemo(() => {
    return data.pos.filter((b) => b.status === 'open' || b.status === 'part-paid');
  }, [data.pos]);

  // Derive occupancy, statistics, and duration for each table
  const tableStats = useMemo(() => {
    const stats: Record<
      string,
      {
        isOccupied: boolean;
        orderTotal: number;
        guestCount: number;
        durationMinutes: number;
        durationLabel: string;
        orderId?: number;
        billNo?: string;
        itemCount: number;
        itemNames: string[];
        statusLabel: string;
      }
    > = {};

    for (const table of tables) {
      const activeOrder = activeOrders.find(
        (o) => o.table_name.toLowerCase() === table.tableNo.toLowerCase()
      );
      const openBill = openBills.find(
        (b) => b.table_no.toLowerCase() === table.tableNo.toLowerCase()
      );

      const isOccupied = Boolean(activeOrder || openBill);

      if (!isOccupied) {
        stats[table.tableNo] = {
          isOccupied: false,
          orderTotal: 0,
          guestCount: 0,
          durationMinutes: 0,
          durationLabel: 'Available',
          itemCount: 0,
          itemNames: [],
          statusLabel: 'Available',
        };
        continue;
      }

      // Calculate elapsed time from created_at
      const createdStr = activeOrder?.created_at ?? openBill?.created_at;
      let durationMinutes = 0;
      let durationLabel = 'Just seated';

      if (createdStr) {
        const createdTime = new Date(createdStr.replace(' ', 'T') + 'Z').getTime();
        if (!isNaN(createdTime) && createdTime > 0) {
          const diffMs = Math.max(0, now - createdTime);
          durationMinutes = Math.floor(diffMs / 60000);

          if (durationMinutes < 1) {
            durationLabel = 'Just seated';
          } else if (durationMinutes < 60) {
            durationLabel = `${durationMinutes}m`;
          } else {
            const hrs = Math.floor(durationMinutes / 60);
            const mins = durationMinutes % 60;
            durationLabel = `${hrs}h ${mins}m`;
          }
        }
      }

      // Calculate items and total
      const orderTotal = openBill?.grand_total ?? activeOrder?.total ?? 0;
      const guestCount = openBill?.guest_count ?? (table.chairCount || 4);

      // Find order lines if available
      const lines = activeOrder
        ? data.order_lines.filter((l) => l.order_id === activeOrder.id)
        : [];
      const itemCount = lines.reduce((s, l) => s + l.quantity, 0) || (openBill ? 2 : 1);
      const itemNames = lines.map((l) => l.name);

      const statusLabel = openBill
        ? 'Billed · Open'
        : activeOrder
        ? `Kitchen · ${activeOrder.status}`
        : 'Occupied';

      stats[table.tableNo] = {
        isOccupied: true,
        orderTotal,
        guestCount,
        durationMinutes,
        durationLabel,
        orderId: activeOrder?.id,
        billNo: openBill?.bill_no,
        itemCount,
        itemNames,
        statusLabel,
      };
    }

    return stats;
  }, [tables, activeOrders, openBills, data.order_lines, now]);

  // Metrics summary
  const totalTables = tables.length;
  const occupiedCount = Object.values(tableStats).filter((s) => s.isOccupied).length;
  const availableCount = totalTables - occupiedCount;
  const totalGuestsSeated = Object.values(tableStats)
    .filter((s) => s.isOccupied)
    .reduce((sum, s) => sum + s.guestCount, 0);

  // Filtered tables
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const isParcel = t.type === 'parcel' || t.tableNo.toLowerCase() === 'parcel';
      if (filter === 'parcel') return isParcel;
      if (filter === 'available') return !tableStats[t.tableNo]?.isOccupied && !isParcel;
      if (filter === 'occupied') return tableStats[t.tableNo]?.isOccupied;
      return true;
    });
  }, [tables, filter, tableStats]);

  // Handle table click: seat party and route to POS
  function handleTableClick(table: TableMasterConfig) {
    const tableNo = table.tableNo;
    const chairs = selectedChairs;

    // Save selection to session storage for POS pickup
    try {
      sessionStorage.setItem(
        'q-cafe-selected-table',
        JSON.stringify({
          tableNo,
          chairCount: chairs,
          timestamp: Date.now(),
        })
      );
    } catch {
      // Storage unavailable
    }

    // Fire custom event so active POS tabs immediately switch
    window.dispatchEvent(
      new CustomEvent('q-cafe-table-selected', {
        detail: { tableNo, chairCount: chairs },
      })
    );

    if (onSelectTable) {
      onSelectTable(tableNo, chairs);
    }

    // Navigate to visual POS billing desk
    navigate('POS');
  }

  return (
    <ItoRegion id="q14" topology={topology} className="flex flex-col h-full space-y-4 overflow-y-auto">
      {/* 1. Header Bar with Overview KPI Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Armchair size={20} />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Floor & Guest Tables
                <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  Touch Desk
                </span>
              </h1>
              <p className="text-xs text-muted-foreground">
                Select party chairs first, then tap any table to open POS or review active bills.
              </p>
            </div>
          </div>
        </div>

        {/* Live KPI Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            {availableCount} Available
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
            <span className="size-2 rounded-full bg-amber-500" />
            {occupiedCount} Occupied
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-700 dark:text-purple-400">
            <Users size={12} />
            {totalGuestsSeated} Seated
          </span>
          <button
            type="button"
            onClick={() => setNow(Date.now())}
            title="Refresh floor status"
            className="grid size-8 place-items-center rounded-xl border border-border text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer active:scale-90 transition-transform"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* 2. Visual Chair Selector (The primary requested touch feature) */}
      <ItoRegion
        id="q14.1"
        topology={topology}
        className="rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/5 via-accent/30 to-background p-3.5 shadow-xs shrink-0"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs shadow-xs">
              1
            </span>
            <span className="text-sm font-bold tracking-tight text-foreground">
              Choose Chairs / Party Size:
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              (Tap chair count to set guest size before assigning table)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Active Party:</span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground shadow-xs">
              <Users size={12} />
              {selectedChairs} {selectedChairs === 1 ? 'Guest / Chair' : 'Guests / Chairs'}
            </span>
          </div>
        </div>

        {/* Tactile Chair Buttons Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Stepper Down */}
          <button
            type="button"
            onClick={() => setSelectedChairs((c) => Math.max(1, c - 1))}
            className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-accent active:scale-90 cursor-pointer transition-all shadow-xs"
            aria-label="Decrease chairs"
            title="Decrease chairs"
          >
            <Minus size={16} />
          </button>

          {/* Presets */}
          {CHAIR_PRESETS.map((preset) => {
            const isSelected = selectedChairs === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => setSelectedChairs(preset)}
                className={`relative flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold cursor-pointer select-none touch-manipulation transition-all duration-150 ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-md scale-105 ring-2 ring-primary/40 -translate-y-0.5'
                    : 'border border-border bg-card text-foreground hover:border-primary/50 hover:bg-accent active:scale-95'
                }`}
              >
                {/* Visual mini-chairs representation */}
                <span className="flex items-center -space-x-1">
                  {Array.from({ length: Math.min(preset, 4) }, (_, i) => (
                    <Armchair
                      key={i}
                      size={12}
                      className={isSelected ? 'text-primary-foreground' : 'text-primary/70'}
                    />
                  ))}
                  {preset > 4 && <span className="text-[10px] font-black pl-0.5">+</span>}
                </span>
                <span>
                  {preset} {preset === 1 ? 'Chair' : 'Chairs'}
                </span>
              </button>
            );
          })}

          {/* Stepper Up */}
          <button
            type="button"
            onClick={() => setSelectedChairs((c) => Math.min(24, c + 1))}
            className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-accent active:scale-90 cursor-pointer transition-all shadow-xs"
            aria-label="Increase chairs"
            title="Increase chairs"
          >
            <Plus size={16} />
          </button>

          {/* Helper Hint */}
          <span className="ml-auto text-xs text-muted-foreground font-medium hidden lg:inline flex items-center gap-1.5">
            <Sparkles size={13} className="text-amber-500" />
            Next step: Tap any table card below to open POS directly!
          </span>
        </div>
      </ItoRegion>

      {/* 3. Filter Chips & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          {(
            [
              { id: 'all', label: `All (${totalTables})` },
              { id: 'available', label: `Available (${availableCount})` },
              { id: 'occupied', label: `Occupied (${occupiedCount})` },
              { id: 'parcel', label: 'Takeaway / Parcel' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all select-none touch-manipulation active:scale-95 ${
                filter === item.id
                  ? 'bg-foreground text-background shadow-xs'
                  : 'border border-border bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="size-2.5 rounded-full border border-emerald-500 bg-emerald-500/20" />
            Available
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2.5 rounded-full border border-amber-500 bg-amber-500/20" />
            Occupied
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2.5 rounded-full border border-blue-500 bg-blue-500/20" />
            Billed
          </span>
        </div>
      </div>

      {/* 4. Floor Table Grid with Touch Feel Cards */}
      <ItoRegion
        id="q14.2"
        topology={topology}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 gap-3.5 pb-6 flex-1 min-h-0"
      >
        {filteredTables.map((table) => {
          const stats = tableStats[table.tableNo] ?? {
            isOccupied: false,
            orderTotal: 0,
            guestCount: 0,
            durationMinutes: 0,
            durationLabel: 'Available',
            itemCount: 0,
            itemNames: [],
            statusLabel: 'Available',
          };
          const isOccupied = stats.isOccupied;
          const isParcel = table.type === 'parcel' || table.tableNo.toLowerCase() === 'parcel';
          const capacity = table.chairCount || 4;
          const fitsParty = capacity >= selectedChairs;

          return (
            <article
              key={table.tableNo}
              onClick={() => handleTableClick(table)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleTableClick(table);
                }
              }}
              className={`group relative flex flex-col justify-between rounded-2xl border p-4 cursor-pointer select-none touch-manipulation transition-all duration-200 hover:-translate-y-1 hover:shadow-lg active:scale-[0.96] active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isOccupied
                  ? 'border-amber-500/50 bg-gradient-to-b from-amber-50/70 to-card dark:from-amber-950/25 dark:to-card shadow-xs'
                  : 'border-border bg-card hover:border-primary/60 hover:bg-accent/40 shadow-xs'
              }`}
            >
              {/* Card Header: Table No, Capacity Badge, and Live Status/Duration */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-1.5">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xl font-extrabold tracking-tight text-foreground group-hover:text-primary transition-colors">
                        {table.tableNo}
                      </span>
                      {isParcel && (
                        <span className="rounded-md bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                          Parcel
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                      <Armchair size={11} />
                      {capacity} {capacity === 1 ? 'Seat' : 'Seats'}
                    </span>
                  </div>

                  {/* Top-Right Badge: Live Duration Rolling Ticker or Available */}
                  {isOccupied ? (
                    <div className="flex flex-col items-end gap-1">
                      {/* Live Rolling Pulse Ticker */}
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 shadow-2xs">
                        <span className="relative flex size-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                          <span className="relative inline-flex rounded-full size-2 bg-amber-500" />
                        </span>
                        <Clock size={10} />
                        <span className="tabular-nums">{stats.durationLabel}</span>
                      </span>

                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {stats.statusLabel}
                      </span>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      Available
                    </span>
                  )}
                </div>

                {/* Visual Table Diagram with Chair Silhouettes */}
                <div className="my-2.5 flex items-center justify-center py-2">
                  <div
                    className={`relative flex items-center justify-center border-2 transition-transform duration-200 group-hover:scale-105 ${
                      table.shape === 'round' || isParcel
                        ? 'size-16 rounded-full'
                        : table.chairCount > 4 || table.shape === 'rectangle'
                        ? 'h-14 w-22 rounded-xl'
                        : 'size-14 rounded-xl'
                    } ${
                      isOccupied
                        ? 'border-amber-500/60 bg-amber-100/60 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
                        : fitsParty
                        ? 'border-primary/50 bg-primary/5 text-primary'
                        : 'border-muted-foreground/30 bg-muted/30 text-muted-foreground'
                    }`}
                  >
                    {isParcel ? (
                      <Coffee size={22} />
                    ) : isOccupied ? (
                      <Utensils size={20} />
                    ) : (
                      <Armchair size={20} />
                    )}

                    {/* Chair dots around table perimeter */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      {Array.from({ length: Math.min(capacity, 8) }).map((_, idx) => {
                        const total = Math.min(capacity, 8);
                        const angle = (idx / total) * 2 * Math.PI - Math.PI / 2;
                        const radius = table.chairCount > 4 ? 34 : 26;
                        const x = Math.cos(angle) * radius;
                        const y = Math.sin(angle) * radius;
                        const isChairActive = idx < selectedChairs;

                        return (
                          <span
                            key={idx}
                            style={{
                              transform: `translate(${x}px, ${y}px)`,
                            }}
                            className={`absolute size-2 rounded-full border transition-colors ${
                              isOccupied
                                ? 'bg-amber-500 border-amber-600'
                                : isChairActive
                                ? 'bg-primary border-primary ring-1 ring-primary/40'
                                : 'bg-muted-foreground/20 border-border'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer: Statistics or Action Prompt */}
              <div className="pt-2 border-t border-border/60">
                {isOccupied ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">
                        {money(stats.orderTotal)}
                      </span>
                      <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                        <Users size={10} />
                        {stats.guestCount} Guests
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="truncate max-w-[110px]">
                        {stats.itemNames.length
                          ? stats.itemNames.slice(0, 2).join(', ')
                          : `${stats.itemCount} item(s)`}
                      </span>
                      <span className="font-semibold text-primary group-hover:underline">
                        Open POS →
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">
                      {fitsParty ? `Fits ${selectedChairs}p` : 'Smaller table'}
                    </span>
                    <span className="font-bold text-primary flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      + Seat & Bill →
                    </span>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </ItoRegion>
    </ItoRegion>
  );
}
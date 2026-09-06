import { useEffect, useMemo, useState } from 'react';
import {
  Armchair,
  Coffee,
  RotateCcw,
  Utensils,
} from 'lucide-react';
import type { InterfaceTopologyController } from '@codexsun/devkit-ito';
import type { Snapshot } from './api';
import { ItoRegion } from './ItoRegion';
import { getMergedTables, type TableMasterConfig } from './mastersStore';

type Props = {
  data: Snapshot;
  navigate: (page: string) => void;
  topology: InterfaceTopologyController;
  onSelectTable?: (tableNo: string, chairCount: number) => void;
};

export function Tables({ data, navigate, topology, onSelectTable }: Props) {
  // Map of tableNo -> selected chair number (default 1)
  const [selectedChairMap, setSelectedChairMap] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<'all' | 'available' | 'occupied' | 'parcel'>('all');
  const [, setNow] = useState<number>(() => Date.now());

  // Active POS tabs synced from sessionStorage or custom event
  const [posActiveTabs, setPosActiveTabs] = useState<
    Array<{
      tableName: string;
      chair: string;
      total: number;
      itemCount: number;
      chairOccupiedList: number[];
    }>
  >(() => {
    try {
      const raw = sessionStorage.getItem('q-cafe-pos-active-tables');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Listen for POS order updates
  useEffect(() => {
    const handlePosSync = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (Array.isArray(detail)) {
        setPosActiveTabs(detail);
      }
    };
    window.addEventListener('q-cafe-pos-tables-updated', handlePosSync);
    return () => window.removeEventListener('q-cafe-pos-tables-updated', handlePosSync);
  }, []);

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

  // Derive occupancy for each table
  const tableStats = useMemo(() => {
    const stats: Record<
      string,
      {
        isOccupied: boolean;
        isBilled: boolean;
        occupiedChairs: number[];
      }
    > = {};

    for (const table of tables) {
      const posTab = posActiveTabs.find(
        (p) => p.tableName.toLowerCase() === table.tableNo.toLowerCase()
      );
      const activeOrder = activeOrders.find(
        (o) => o.table_name.toLowerCase() === table.tableNo.toLowerCase()
      );
      const openBill = openBills.find(
        (b) => b.table_no.toLowerCase() === table.tableNo.toLowerCase()
      );
      const dbTable = data.restaurant_tables.find(
        (t) => t.table_no.toLowerCase() === table.tableNo.toLowerCase()
      );

      const isBilled = Boolean(openBill);
      const isOccupied = Boolean(
        posTab || activeOrder || openBill || dbTable?.status === 'occupied'
      );
      const occupiedChairs = posTab?.chairOccupiedList ?? [];

      stats[table.tableNo] = {
        isOccupied,
        isBilled,
        occupiedChairs,
      };
    }

    return stats;
  }, [tables, posActiveTabs, activeOrders, openBills, data.restaurant_tables]);

  // Metrics summary
  const totalTables = tables.length;
  const occupiedCount = Object.values(tableStats).filter((s) => s.isOccupied).length;
  const availableCount = totalTables - occupiedCount;

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

  // Select a chair for a table
  function handleChairSelect(tableNo: string, chairNum: number) {
    setSelectedChairMap((prev) => ({
      ...prev,
      [tableNo]: chairNum,
    }));
  }

  // Hit the table to navigate to POS with the selected chair
  function handleTableHit(table: TableMasterConfig, chairOverride?: number) {
    const tableNo = table.tableNo;
    const chair = chairOverride ?? selectedChairMap[tableNo] ?? 1;

    try {
      sessionStorage.setItem(
        'q-cafe-selected-table',
        JSON.stringify({
          tableNo,
          chairCount: chair,
          timestamp: Date.now(),
        })
      );
    } catch {
      // Storage unavailable
    }

    window.dispatchEvent(
      new CustomEvent('q-cafe-table-selected', {
        detail: { tableNo, chairCount: chair },
      })
    );

    if (onSelectTable) {
      onSelectTable(tableNo, chair);
    }

    navigate('POS');
  }

  return (
    <ItoRegion id="q14" topology={topology} className="flex flex-col h-full space-y-4 overflow-y-auto">
      {/* 1. Header Bar with Overview KPI Badges */}
      {/* 1. Simplified Header Bar with Counts */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <Armchair size={20} />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Floor & Guest Tables
            </h1>
            <p className="text-xs text-muted-foreground">
              Select chair on table, then hit table to start billing in POS.
            </p>
          </div>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <span className="size-2 rounded-full bg-emerald-500" />
            {availableCount} Available
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
            <span className="size-2 rounded-full bg-amber-500" />
            {occupiedCount} Occupied
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

      {/* 2. Filter Chips & Legend */}
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

        {/* Legend: Dots only */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-emerald-500 shadow-xs" />
            Available
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-amber-500 shadow-xs" />
            Occupied
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-blue-500 shadow-xs" />
            Billed
          </span>
        </div>
      </div>

      {/* 3. Floor Table Grid with Interactive Chairs Around Table */}
      <ItoRegion
        id="q14.2"
        topology={topology}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 gap-4 pb-6 flex-1 min-h-0"
      >
        {filteredTables.map((table) => {
          const stats = tableStats[table.tableNo] ?? {
            isOccupied: false,
            isBilled: false,
            occupiedChairs: [],
          };
          const isOccupied = stats.isOccupied;
          const isBilled = stats.isBilled;
          const isParcel = table.type === 'parcel' || table.tableNo.toLowerCase() === 'parcel';
          const capacity = table.chairCount || 4;
          const selectedChair = selectedChairMap[table.tableNo] ?? 1;

          // Split chairs around the table: top row and bottom row
          const topCount = Math.ceil(capacity / 2);
          const topChairs = Array.from({ length: topCount }, (_, i) => i + 1);
          const bottomChairs = Array.from({ length: capacity - topCount }, (_, i) => topCount + 1 + i);

          return (
            <article
              key={table.tableNo}
              className={`group relative flex flex-col justify-between rounded-2xl border p-3.5 bg-card select-none touch-manipulation transition-all duration-200 hover:shadow-lg ${
                isOccupied
                  ? 'border-amber-500/50 bg-gradient-to-b from-amber-50/50 to-card dark:from-amber-950/20 dark:to-card shadow-xs'
                  : 'border-border hover:border-primary/50 shadow-xs'
              }`}
            >
              {/* Card Header: Table No on left, Trimmed status to ONLY green/amber/blue dot on right */}
              <div className="flex items-center justify-between pb-2">
                <span className="text-lg font-extrabold tracking-tight text-foreground">
                  {table.tableNo}
                </span>

                {/* Only green dot for available, amber dot for occupied, blue dot for billed */}
                <div className="flex items-center">
                  {isOccupied ? (
                    <span
                      title="Occupied"
                      className="relative flex size-2.5"
                    >
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full size-2.5 bg-amber-500 shadow-xs" />
                    </span>
                  ) : isBilled ? (
                    <span
                      title="Billed"
                      className="size-2.5 rounded-full bg-blue-500 shadow-xs inline-block"
                    />
                  ) : (
                    <span
                      title="Available"
                      className="size-2.5 rounded-full bg-emerald-500 shadow-xs inline-block"
                    />
                  )}
                </div>
              </div>

              {/* Center: Interactive Chairs Around Table Pattern */}
              <div className="flex flex-col items-center justify-center flex-1 py-1">
                {isParcel ? (
                  /* Parcel / Takeaway Display */
                  <div className="w-full flex flex-col items-center gap-2 py-3">
                    <button
                      type="button"
                      onClick={() => handleTableHit(table, 1)}
                      title="Parcel / Takeaway counter · Hit to open POS"
                      className="w-full py-6 rounded-2xl border-2 border-purple-500/40 bg-purple-500/5 hover:bg-purple-500/10 flex flex-col items-center justify-center gap-2 text-purple-700 dark:text-purple-300 cursor-pointer select-none touch-manipulation transition-all duration-150 active:scale-95 shadow-xs"
                    >
                      <Coffee size={26} />
                      <span className="text-xs font-bold">Takeaway</span>
                    </button>
                  </div>
                ) : (
                  /* Dine-in Table with Chairs Around It */
                  <div className="w-full flex flex-col items-center gap-1.5">
                    {/* Top Row of Chairs (2 chairs for 4p, 3 for 6p) */}
                    <div className="flex items-center justify-center gap-2 w-full">
                      {topChairs.map((chairNum) => {
                        const isSelected = selectedChair === chairNum;
                        const isOccupiedChair = stats.occupiedChairs.includes(chairNum);
                        return (
                          <button
                            key={chairNum}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChairSelect(table.tableNo, chairNum);
                            }}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              handleChairSelect(table.tableNo, chairNum);
                              handleTableHit(table, chairNum);
                            }}
                            title={`Chair ${chairNum} (Tap to select, then hit table to open POS)`}
                            className={`flex items-center justify-center gap-1 min-w-9 h-8 px-2 rounded-xl border text-xs font-bold cursor-pointer select-none touch-manipulation transition-all duration-150 active:scale-90 ${
                              isSelected
                                ? 'bg-primary text-primary-foreground border-primary ring-2 ring-primary/40 shadow-sm scale-105'
                                : isOccupiedChair
                                ? 'bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/50 hover:bg-amber-500/30'
                                : 'bg-muted/40 text-muted-foreground border-border hover:border-primary/50 hover:text-foreground hover:bg-accent'
                            }`}
                          >
                            <Armchair
                              size={13}
                              className={isSelected ? 'text-primary-foreground' : 'text-current'}
                            />
                            <span>{chairNum}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Table Surface Center (Hit Table to open POS with selected chair) */}
                    <button
                      type="button"
                      onClick={() => handleTableHit(table, selectedChair)}
                      title={`Table ${table.tableNo} · Hit to open POS with Chair ${selectedChair}`}
                      className={`w-full py-5 px-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 cursor-pointer select-none touch-manipulation transition-all duration-150 hover:shadow-md active:scale-95 ${
                        isOccupied
                          ? 'border-amber-500/60 bg-gradient-to-b from-amber-50 to-amber-100/40 dark:from-amber-950/40 dark:to-card text-amber-900 dark:text-amber-100 shadow-xs'
                          : 'border-border hover:border-primary/60 bg-gradient-to-b from-card to-accent/25 hover:bg-primary/5 text-foreground shadow-xs'
                      }`}
                    >
                      <Utensils
                        size={22}
                        className={
                          isOccupied
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-muted-foreground/80 group-hover:text-primary transition-colors'
                        }
                      />
                      <span className="text-xs font-bold tracking-tight text-foreground/80">
                        {table.tableNo}
                      </span>
                    </button>

                    {/* Bottom Row of Chairs (2 chairs for 4p, 3 for 6p) */}
                    <div className="flex items-center justify-center gap-2 w-full">
                      {bottomChairs.map((chairNum) => {
                        const isSelected = selectedChair === chairNum;
                        const isOccupiedChair = stats.occupiedChairs.includes(chairNum);
                        return (
                          <button
                            key={chairNum}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChairSelect(table.tableNo, chairNum);
                            }}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              handleChairSelect(table.tableNo, chairNum);
                              handleTableHit(table, chairNum);
                            }}
                            title={`Chair ${chairNum} (Tap to select, then hit table to open POS)`}
                            className={`flex items-center justify-center gap-1 min-w-9 h-8 px-2 rounded-xl border text-xs font-bold cursor-pointer select-none touch-manipulation transition-all duration-150 active:scale-90 ${
                              isSelected
                                ? 'bg-primary text-primary-foreground border-primary ring-2 ring-primary/40 shadow-sm scale-105'
                                : isOccupiedChair
                                ? 'bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/50 hover:bg-amber-500/30'
                                : 'bg-muted/40 text-muted-foreground border-border hover:border-primary/50 hover:text-foreground hover:bg-accent'
                            }`}
                          >
                            <Armchair
                              size={13}
                              className={isSelected ? 'text-primary-foreground' : 'text-current'}
                            />
                            <span>{chairNum}</span>
                          </button>
                        );
                      })}
                    </div>
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
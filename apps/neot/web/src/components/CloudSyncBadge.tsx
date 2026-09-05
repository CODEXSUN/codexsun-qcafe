import React from 'react';
import { Cloud, CloudCheck, RefreshCw, AlertCircle } from 'lucide-react';
import type { SyncStatusSummary } from '../types.js';

interface CloudSyncBadgeProps {
  syncStatus: SyncStatusSummary | null;
  onClick: () => void;
}

export function CloudSyncBadge({ syncStatus, onClick }: CloudSyncBadgeProps) {
  const isSyncing = syncStatus?.status === 'syncing';
  const isError = syncStatus?.status === 'error';
  const hasPending = (syncStatus?.pendingChangesCount ?? 0) > 0;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-200 border border-emerald-700/40 transition-colors"
      title={`Cloud Connection: ${syncStatus?.cloudUrl ?? 'https://neot.in'} (${syncStatus?.status ?? 'local'})`}
    >
      {isSyncing ? (
        <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
      ) : isError ? (
        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
      ) : hasPending ? (
        <Cloud className="w-3.5 h-3.5 text-amber-300" />
      ) : (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
        </span>
      )}
      <span className="font-mono text-[11px] tracking-tight">neot.in</span>
    </button>
  );
}

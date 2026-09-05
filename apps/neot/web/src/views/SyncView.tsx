import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  Cloud,
  Globe,
  Key,
  RefreshCw,
  Shield,
} from 'lucide-react';
import type { SyncStatusSummary } from '../types.js';
import { checkCloudHealth, pullFromCloud, pushToCloud } from '../api.js';

interface SyncViewProps {
  syncStatus: SyncStatusSummary | null;
  onRefreshStatus: () => void;
}

export function SyncView({ syncStatus, onRefreshStatus }: SyncViewProps) {
  const [tokenInput, setTokenInput] = useState(
    localStorage.getItem('neot_cloud_token') || ''
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [syncLog, setSyncLog] = useState<string[]>([]);

  const handleSaveToken = () => {
    localStorage.setItem('neot_cloud_token', tokenInput.trim());
    alert('Token saved to local browser storage.');
  };

  const handleCheckHealth = async () => {
    setIsProcessing(true);
    try {
      const res = await checkCloudHealth();
      setSyncLog(prev => [`[${new Date().toLocaleTimeString()}] Health check: ${res.ok ? 'OK' : 'Error'} (${res.message})`, ...prev]);
      onRefreshStatus();
    } catch (err) {
      setSyncLog(prev => [`[${new Date().toLocaleTimeString()}] Health check failed: ${err}`, ...prev]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePull = async () => {
    setIsProcessing(true);
    try {
      const res = await pullFromCloud(tokenInput.trim() || undefined);
      setSyncLog(prev => [
        `[${new Date().toLocaleTimeString()}] Pull result: ${res.message}`,
        ...prev
      ]);
      onRefreshStatus();
    } catch (err) {
      setSyncLog(prev => [`[${new Date().toLocaleTimeString()}] Pull error: ${err}`, ...prev]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePush = async () => {
    setIsProcessing(true);
    try {
      const res = await pushToCloud(tokenInput.trim() || undefined);
      setSyncLog(prev => [
        `[${new Date().toLocaleTimeString()}] Push result: ${res.message}`,
        ...prev
      ]);
      onRefreshStatus();
    } catch (err) {
      setSyncLog(prev => [`[${new Date().toLocaleTimeString()}] Push error: ${err}`, ...prev]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-xl md:text-2xl font-black text-slate-900">Cloud Sync & neot.in Connection</h1>
        <p className="text-xs text-slate-500 mt-1">
          Synchronize local courses, lesson progress, and quiz attempts with the central NEOT cloud.
        </p>
      </div>

      {/* Connection Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Target Cloud Endpoint</h2>
              <p className="text-xs text-emerald-800 font-mono mt-0.5">
                {syncStatus?.cloudUrl ?? 'https://neot.in'}
              </p>
            </div>
          </div>

          <button
            onClick={handleCheckHealth}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>Check Health</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Role</span>
            <span className="font-bold text-slate-800 capitalize">{syncStatus?.role ?? 'local'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Status</span>
            <span className="font-bold text-emerald-800 capitalize">{syncStatus?.status ?? 'ready'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Last Pulled</span>
            <span className="font-bold text-slate-800">
              {syncStatus?.lastPulledAt ? new Date(syncStatus.lastPulledAt).toLocaleTimeString() : 'Never'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Last Published</span>
            <span className="font-bold text-slate-800">
              {syncStatus?.lastPublishedAt ? new Date(syncStatus.lastPublishedAt).toLocaleTimeString() : 'Never'}
            </span>
          </div>
        </div>
      </div>

      {/* Token & Authentication */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Key className="w-4 h-4 text-slate-400" />
          <span>Cloud Sync Access Token</span>
        </h2>
        <div className="flex gap-2">
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Paste your neot.in API or sync token..."
            className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
          />
          <button
            onClick={handleSaveToken}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 text-white hover:bg-slate-900"
          >
            Save
          </button>
        </div>
        <p className="text-[11px] text-slate-400">
          This token authenticates bidirectional snapshot sync with your organisation tenant on <a href="https://neot.in" target="_blank" rel="noreferrer" className="underline text-emerald-700">neot.in</a>.
        </p>
      </div>

      {/* Manual Sync Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
            <ArrowDownToLine className="w-4 h-4" />
            <span>Pull Remote Snapshot</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Download latest courses, lessons, and tests published to neot.in into your local workspace.
          </p>
          <button
            onClick={handlePull}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50 shadow-xs"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>Pull from neot.in</span>
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
            <ArrowUpFromLine className="w-4 h-4" />
            <span>Publish Local Progress</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Push completed lesson progress, questions, answers, and quiz attempt scores to neot.in.
          </p>
          <button
            onClick={handlePush}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50 shadow-xs"
          >
            <ArrowUpFromLine className="w-3.5 h-3.5" />
            <span>Publish to neot.in</span>
          </button>
        </div>
      </div>

      {/* Sync Console Log */}
      {syncLog.length > 0 && (
        <div className="bg-slate-900 rounded-3xl p-5 text-emerald-400 font-mono text-xs space-y-1 max-h-48 overflow-y-auto">
          <div className="text-slate-400 font-bold mb-2">Sync Activity Console:</div>
          {syncLog.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </div>
      )}
    </div>
  );
}

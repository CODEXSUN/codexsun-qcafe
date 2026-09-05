import React from 'react';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  GraduationCap,
  Home,
  MessageSquare,
  TrendingUp,
  Cloud,
} from 'lucide-react';
import { NeotLogo } from './NeotLogo.js';
import { CloudSyncBadge } from './CloudSyncBadge.js';
import type { SyncStatusSummary } from '../types.js';

export type TabKey = 'home' | 'learn' | 'classes' | 'qa' | 'tests' | 'progress' | 'sync';

interface NavigationProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  syncStatus: SyncStatusSummary | null;
  onOpenSync: () => void;
  userRole: 'student' | 'master';
  onToggleRole: () => void;
  userEmail: string;
}

export function Navigation({
  activeTab,
  onTabChange,
  syncStatus,
  onOpenSync,
  userRole,
  onToggleRole,
  userEmail,
}: NavigationProps) {
  const navItems: Array<{ key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { key: 'home', label: 'Home', icon: Home },
    { key: 'learn', label: 'Learn', icon: BookOpen },
    { key: 'classes', label: 'Classes', icon: Calendar },
    { key: 'qa', label: 'Q & A', icon: MessageSquare },
    { key: 'tests', label: 'Tests', icon: CheckCircle2 },
    { key: 'progress', label: 'Progress', icon: TrendingUp },
    { key: 'sync', label: 'Cloud Sync', icon: Cloud },
  ];

  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-emerald-950 text-white border-b border-emerald-900/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-emerald-800/60 text-emerald-300 rounded-xl border border-emerald-700/50 flex items-center justify-center">
              <NeotLogo size={26} className="text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-wider text-emerald-100">NEOT</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-800/80 text-emerald-300 border border-emerald-700/50">
                  LMS
                </span>
              </div>
              <p className="text-[11px] text-emerald-400/90 hidden sm:block">Learn today. Own tomorrow.</p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-emerald-900/40 p-1 rounded-xl border border-emerald-800/50">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => onTabChange(item.key)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-emerald-200/80 hover:text-white hover:bg-emerald-800/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2.5">
            <CloudSyncBadge syncStatus={syncStatus} onClick={onOpenSync} />

            <button
              onClick={onToggleRole}
              title={`Switch role (Current: ${userRole})`}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-200 border border-emerald-700/40 transition-colors"
            >
              <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
              <span className="capitalize hidden sm:inline">{userRole}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile-First Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 safe-bottom shadow-lg">
        <div className="grid grid-cols-6 h-14">
          {navItems.slice(0, 6).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onTabChange(item.key)}
                className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  isActive ? 'text-emerald-700 font-semibold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
                <span className="text-[10px] tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}

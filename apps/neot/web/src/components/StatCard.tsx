import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor?: 'emerald' | 'blue' | 'amber' | 'purple';
}

export function StatCard({ label, value, subtext, icon: Icon, accentColor = 'emerald' }: StatCardProps) {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    blue: 'bg-blue-50 text-blue-700 border-blue-200/80',
    amber: 'bg-amber-50 text-amber-700 border-amber-200/80',
    purple: 'bg-purple-50 text-purple-700 border-purple-200/80',
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center gap-3.5">
      <div className={`p-2.5 rounded-xl border ${colorMap[accentColor]} flex-shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500 font-medium truncate">{label}</p>
        <p className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">{value}</p>
        {subtext && <p className="text-[11px] text-slate-400 truncate mt-0.5">{subtext}</p>}
      </div>
    </div>
  );
}

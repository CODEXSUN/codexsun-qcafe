import React, { useEffect, useState } from 'react';
import { Navigation, type TabKey } from './components/Navigation.js';
import { DashboardView } from './views/DashboardView.js';
import { LearnView } from './views/LearnView.js';
import { ClassesView } from './views/ClassesView.js';
import { QandAView } from './views/QandAView.js';
import { TestsView } from './views/TestsView.js';
import { ProgressView } from './views/ProgressView.js';
import { SyncView } from './views/SyncView.js';
import { fetchSnapshot, getSyncStatus } from './api.js';
import type { NeotSnapshot, SyncStatusSummary } from './types.js';

export function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [activeLessonUuid, setActiveLessonUuid] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<NeotSnapshot | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatusSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'student' | 'master'>('student');
  const [userEmail, setUserEmail] = useState<string>('student@neot.in');

  const loadData = async () => {
    try {
      const [snap, sync] = await Promise.all([
        fetchSnapshot(userEmail),
        getSyncStatus().catch(() => null),
      ]);
      setSnapshot(snap);
      setSyncStatus(sync);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to NEOT API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userEmail]);

  const handleOpenLesson = (lessonUuid: string) => {
    setActiveLessonUuid(lessonUuid);
    setActiveTab('learn');
  };

  const handleToggleRole = () => {
    if (userRole === 'student') {
      setUserRole('master');
      setUserEmail('master@neot.in');
    } else {
      setUserRole('student');
      setUserEmail('student@neot.in');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-900 text-emerald-300 flex items-center justify-center font-extrabold text-xl animate-pulse shadow-sm">
          N
        </div>
        <p className="text-xs font-bold text-slate-500 mt-3 tracking-wide">Starting NEOT LMS...</p>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-200 mb-3">
          !
        </div>
        <h2 className="text-base font-bold text-slate-900">Connection to NEOT API Failed</h2>
        <p className="text-xs text-slate-500 mt-1">{error}</p>
        <p className="text-[11px] text-slate-400 mt-2">
          Make sure the NEOT API server is running on port 4250.
        </p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        syncStatus={syncStatus}
        onOpenSync={() => setActiveTab('sync')}
        userRole={userRole}
        onToggleRole={handleToggleRole}
        userEmail={userEmail}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {activeTab === 'home' && (
          <DashboardView
            snapshot={snapshot}
            onOpenLesson={handleOpenLesson}
            onNavigateTab={setActiveTab}
            userEmail={userEmail}
          />
        )}
        {activeTab === 'learn' && (
          <LearnView
            snapshot={snapshot}
            activeLessonUuid={activeLessonUuid}
            onSelectLesson={setActiveLessonUuid}
            onRefresh={loadData}
            userEmail={userEmail}
          />
        )}
        {activeTab === 'classes' && (
          <ClassesView
            snapshot={snapshot}
            userEmail={userEmail}
            onRefresh={loadData}
          />
        )}
        {activeTab === 'qa' && (
          <QandAView
            snapshot={snapshot}
            onRefresh={loadData}
            userEmail={userEmail}
            userRole={userRole}
          />
        )}
        {activeTab === 'tests' && (
          <TestsView
            snapshot={snapshot}
            onRefresh={loadData}
            userEmail={userEmail}
          />
        )}
        {activeTab === 'progress' && (
          <ProgressView
            snapshot={snapshot}
            userEmail={userEmail}
            onRefresh={loadData}
          />
        )}
        {activeTab === 'sync' && (
          <SyncView
            syncStatus={syncStatus}
            onRefreshStatus={loadData}
          />
        )}
      </main>
    </div>
  );
}

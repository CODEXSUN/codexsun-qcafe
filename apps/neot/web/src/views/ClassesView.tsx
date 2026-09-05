import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Mail,
  Users,
  CheckCircle,
  UserCheck,
  Plus,
  X,
  ClipboardList,
} from 'lucide-react';
import type { NeotSnapshot } from '../types.js';
import { createAttendanceSession, recordAttendance } from '../api.js';

interface ClassesViewProps {
  snapshot: NeotSnapshot;
  userEmail: string;
  onRefresh?: () => void;
}

export function ClassesView({ snapshot, userEmail, onRefresh }: ClassesViewProps) {
  const [selectedClassUuid, setSelectedClassUuid] = useState<string | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active class for attendance management
  const activeClass = snapshot.classes.find(c => c.uuid === selectedClassUuid);
  const classSessions = snapshot.attendanceSessions?.filter(s => s.classUuid === activeClass?.uuid) || [];
  const classEnrollments = snapshot.enrollments.filter(e => e.classUuid === activeClass?.uuid || e.courseUuid === activeClass?.courseUuid);

  const handleCreateSessionAndAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass || !newTopic.trim()) return;
    setIsSubmitting(true);
    try {
      const session = await createAttendanceSession(activeClass.uuid, {
        sessionDate,
        topic: newTopic.trim(),
        createdBy: userEmail,
      });

      // Default all enrolled members to present
      const records = classEnrollments.length > 0
        ? classEnrollments.map(e => ({
            studentEmail: e.memberEmail,
            status: 'present' as const,
            notes: 'Roll call entry',
          }))
        : [{ studentEmail: userEmail, status: 'present' as const, notes: 'Self check-in' }];

      await recordAttendance(session.uuid, records);
      alert(`Attendance session "${newTopic}" created with ${records.length} records.`);
      setNewTopic('');
      setShowSessionModal(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Failed to log attendance session: ' + err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900">Scheduled Classes & Cohorts</h1>
          <p className="text-xs text-slate-500 mt-1">
            Classes provide scheduled course delivery, live attendance roll-calls, and mentor checkpoints.
          </p>
        </div>
      </div>

      {/* Class Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {snapshot.classes.map((cls) => {
          const course = snapshot.courses.find(c => c.uuid === cls.courseUuid);
          const enrollments = snapshot.enrollments.filter(e => e.classUuid === cls.uuid || e.courseUuid === cls.courseUuid);
          const sessions = snapshot.attendanceSessions?.filter(s => s.classUuid === cls.uuid) || [];

          return (
            <div
              key={cls.uuid}
              className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-teal-300 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">
                      {course?.title ?? 'General Course'}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">{cls.title}</h3>
                  </div>
                  <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200 capitalize">
                    {cls.status}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>{cls.scheduleText || 'Weekly cohort schedule'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>Master: <strong className="text-slate-700">{cls.masterEmail || 'master@neot.in'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>{enrollments.length} enrolled members</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-teal-600" />
                    <span>{sessions.length} attendance sessions logged</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    setSelectedClassUuid(cls.uuid);
                    setShowSessionModal(false);
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>View Roll-Call ({sessions.length})</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedClassUuid(cls.uuid);
                    setShowSessionModal(true);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold rounded-xl text-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log Attendance</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Attendance Drawer / Details for selected class */}
      {activeClass && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold text-teal-600 uppercase">Roll-Call Register</span>
              <h2 className="text-lg font-bold text-slate-900">{activeClass.title} Attendance Logs</h2>
            </div>
            <button
              onClick={() => setSelectedClassUuid(null)}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {classSessions.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No attendance sessions logged yet for this cohort. Click &ldquo;Log Attendance&rdquo; to start roll-call.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classSessions.map(session => {
                const records = snapshot.attendanceRecords?.filter(r => r.sessionUuid === session.uuid) || [];
                const presentCount = records.filter(r => r.status === 'present').length;

                return (
                  <div key={session.uuid} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500">{session.sessionDate}</span>
                        <h4 className="text-xs font-bold text-slate-900 mt-0.5">{session.topic || 'Class Session'}</h4>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                        {presentCount} / {records.length || 1} Present
                      </span>
                    </div>

                    <div className="space-y-1 pt-2 border-t border-slate-200/60 text-xs">
                      {records.slice(0, 4).map(r => (
                        <div key={r.uuid || r.studentEmail} className="flex items-center justify-between text-slate-600">
                          <span className="truncate max-w-[180px]">{r.studentEmail}</span>
                          <span className="capitalize font-semibold text-[11px] text-teal-700">{r.status}</span>
                        </div>
                      ))}
                      {records.length > 4 && (
                        <p className="text-[10px] text-slate-400 italic">+{records.length - 4} more records</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Log Attendance Modal */}
      {showSessionModal && activeClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900">Record Class Attendance</h3>
              </div>
              <button
                onClick={() => setShowSessionModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSessionAndAttendance} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Session Date</label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={e => setSessionDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Session Topic / Agenda</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Modern CSS Grid & Layout Architecture"
                  value={newTopic}
                  onChange={e => setNewTopic(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600">
                <p className="font-semibold text-slate-800 mb-1">Cohort Members for Roll-Call:</p>
                <p className="text-[11px]">
                  {classEnrollments.length > 0
                    ? `${classEnrollments.length} registered students will be initially logged as Present.`
                    : 'Current active participant will be logged as Present.'}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSessionModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newTopic.trim()}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording...' : 'Confirm Roll-Call'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

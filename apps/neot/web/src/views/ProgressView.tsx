import React, { useState } from 'react';
import {
  Award,
  BarChart3,
  CheckCircle2,
  Flame,
  TrendingUp,
  XCircle,
  ShieldCheck,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { StatCard } from '../components/StatCard.js';
import { CertificateModal } from '../components/CertificateModal.js';
import type { LearningCertificate, NeotSnapshot } from '../types.js';
import { claimCertificate } from '../api.js';

interface ProgressViewProps {
  snapshot: NeotSnapshot;
  userEmail: string;
  onRefresh?: () => void;
}

export function ProgressView({ snapshot, userEmail, onRefresh }: ProgressViewProps) {
  const [selectedCert, setSelectedCert] = useState<LearningCertificate | null>(null);
  const [isClaiming, setIsClaiming] = useState<string | null>(null);

  const userAttempts = snapshot.attempts.filter(a => a.studentEmail === userEmail);
  const completedLessons = snapshot.progress.filter(p => p.status === 'completed').length;
  const totalLessons = snapshot.lessons.length;

  const passedCount = userAttempts.filter(a => a.passed).length;
  const avgPct = userAttempts.length > 0
    ? Math.round(userAttempts.reduce((acc, c) => acc + c.percentage, 0) / userAttempts.length)
    : 0;

  const certificates = snapshot.certificates?.filter(c => c.studentEmail === userEmail) || [];

  const handleClaim = async (courseUuid: string) => {
    setIsClaiming(courseUuid);
    try {
      const cert = await claimCertificate(courseUuid, 95, userEmail);
      setSelectedCert(cert);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Failed to issue certificate: ' + err);
    } finally {
      setIsClaiming(null);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-xl md:text-2xl font-black text-slate-900">Learning Progress & Evidence</h1>
        <p className="text-xs text-slate-500 mt-1">
          Detailed metrics of your course progress, lesson completions, quiz mastery, and academic credentials.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          label="Lessons Completed"
          value={completedLessons}
          subtext={`out of ${totalLessons} total lessons`}
          icon={CheckCircle2}
          accentColor="emerald"
        />
        <StatCard
          label="Average Score"
          value={`${avgPct}%`}
          subtext="across all quiz attempts"
          icon={TrendingUp}
          accentColor="blue"
        />
        <StatCard
          label="Tests Passed"
          value={passedCount}
          subtext={`out of ${userAttempts.length} attempts`}
          icon={Award}
          accentColor="amber"
        />
        <StatCard
          label="Certificates"
          value={certificates.length}
          subtext="Verifiable on neot.in"
          icon={ShieldCheck}
          accentColor="purple"
        />
      </div>

      {/* Earned Verifiable Certificates Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-teal-600" />
            <h2 className="text-sm font-bold text-slate-900">Earned Verifiable Certificates</h2>
          </div>
          <span className="text-xs text-slate-400">Cryptographically Signed</span>
        </div>

        {certificates.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-xs">
            Complete a course or pass its comprehensive assessment to unlock your official credential.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {certificates.map(cert => {
              const course = snapshot.courses.find(c => c.uuid === cert.courseUuid);
              return (
                <div
                  key={cert.uuid || cert.certificateCode}
                  className="p-5 bg-gradient-to-br from-teal-500/10 via-slate-50 to-emerald-500/10 border border-teal-500/30 rounded-2xl flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">Official Credential</span>
                      <h4 className="text-sm font-bold text-slate-900 mt-0.5">{course?.title ?? 'Domain Mastery'}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Grade: {cert.gradePercentage}% &bull; Issued {new Date(cert.issuedAt).toLocaleDateString()}</p>
                    </div>
                    <ShieldCheck className="w-6 h-6 text-teal-600" />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-teal-500/20 text-xs">
                    <span className="font-mono text-[11px] font-bold text-slate-700">{cert.certificateCode}</span>
                    <button
                      onClick={() => setSelectedCert(cert)}
                      className="flex items-center gap-1 text-teal-700 hover:text-teal-800 font-bold"
                    >
                      <span>View Credential</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Course Completion Breakdown & Claim Action */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900">Course Completion & Credential Eligibility</h2>
        <div className="space-y-4">
          {snapshot.courses.map((course) => {
            const courseLessons = snapshot.lessons.filter(l => {
              const subj = snapshot.subjects.find(s => s.uuid === l.subjectUuid);
              return subj?.courseUuid === course.uuid;
            });
            const done = courseLessons.filter(l =>
              snapshot.progress.some(p => p.lessonUuid === l.uuid && p.status === 'completed')
            ).length;
            const pct = courseLessons.length > 0 ? Math.round((done / courseLessons.length) * 100) : 0;
            const alreadyHasCert = certificates.some(c => c.courseUuid === course.uuid);

            return (
              <div key={course.uuid} className="p-4 bg-slate-50/60 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                  <span className="font-semibold text-slate-800">{course.title}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-teal-800">{done}/{courseLessons.length} ({pct}%)</span>
                    {alreadyHasCert ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                        <CheckCircle2 className="w-3 h-3" /> Certified
                      </span>
                    ) : (
                      <button
                        onClick={() => handleClaim(course.uuid)}
                        disabled={isClaiming === course.uuid}
                        className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors shadow-xs disabled:opacity-50"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{isClaiming === course.uuid ? 'Issuing...' : 'Claim Certificate'}</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="h-2 w-full bg-slate-200/80 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-600 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Attempt History Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900">Assessment History</h2>
        {userAttempts.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            No quiz attempts recorded yet. Visit the Tests tab to test your knowledge.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold">
                  <th className="pb-2">Test</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Score</th>
                  <th className="pb-2">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {userAttempts.map((att) => {
                  const test = snapshot.tests.find(t => t.uuid === att.testUuid);
                  return (
                    <tr key={att.uuid} className="hover:bg-slate-50/50">
                      <td className="py-2.5 font-semibold text-slate-900">{test?.title ?? 'Quiz'}</td>
                      <td className="py-2.5 text-slate-400">{new Date(att.completedAt).toLocaleDateString()}</td>
                      <td className="py-2.5 font-bold text-teal-800">{att.score}/{att.totalPoints} ({att.percentage}%)</td>
                      <td className="py-2.5">
                        {att.passed ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Passed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3" /> Failed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Certificate Modal */}
      {selectedCert && (
        <CertificateModal
          certificate={selectedCert}
          course={snapshot.courses.find(c => c.uuid === selectedCert.courseUuid)}
          studentName={(userEmail.split('@')[0] ?? 'STUDENT').toUpperCase()}
          onClose={() => setSelectedCert(null)}
        />
      )}
    </div>
  );
}

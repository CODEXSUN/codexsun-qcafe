import React from 'react';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  GraduationCap,
  Play,
  TrendingUp,
} from 'lucide-react';
import { StatCard } from '../components/StatCard.js';
import type { NeotSnapshot } from '../types.js';

interface DashboardViewProps {
  snapshot: NeotSnapshot;
  onOpenLesson: (lessonUuid: string) => void;
  onNavigateTab: (tab: any) => void;
  userEmail: string;
}

export function DashboardView({ snapshot, onOpenLesson, onNavigateTab, userEmail }: DashboardViewProps) {
  const completedLessons = snapshot.progress.filter(p => p.status === 'completed').length;
  const totalLessons = snapshot.lessons.length;
  const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const userAttempts = snapshot.attempts.filter(a => a.studentEmail === userEmail);
  const passedQuizzes = userAttempts.filter(a => a.passed).length;
  const avgScore = userAttempts.length > 0
    ? Math.round(userAttempts.reduce((acc, cur) => acc + cur.percentage, 0) / userAttempts.length)
    : 0;

  // Next up lesson
  const firstUnfinishedLesson = snapshot.lessons.find(
    l => !snapshot.progress.some(p => p.lessonUuid === l.uuid && p.status === 'completed')
  ) || snapshot.lessons[0];

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white p-6 md:p-8 shadow-sm">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-800/80 text-emerald-200 text-xs font-semibold mb-3 border border-emerald-700/60">
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>Active Study Session</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Next Era on Teaching
          </h1>
          <p className="mt-2 text-sm md:text-base text-emerald-100/90 leading-relaxed">
            Welcome to NEOT LMS. Access your curriculum hierarchy, attend scheduled classes, ask questions, and test your mastery.
          </p>

          {firstUnfinishedLesson && (
            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={() => onOpenLesson(firstUnfinishedLesson.uuid)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-emerald-950 font-bold text-sm hover:bg-emerald-50 transition-colors shadow-sm"
              >
                <Play className="w-4 h-4 fill-emerald-950" />
                <span>Resume: {firstUnfinishedLesson.title}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          label="Course Progress"
          value={`${progressPct}%`}
          subtext={`${completedLessons} of ${totalLessons} lessons`}
          icon={BookOpen}
          accentColor="emerald"
        />
        <StatCard
          label="Quiz Average"
          value={`${avgScore}%`}
          subtext={`${passedQuizzes} passed tests`}
          icon={CheckCircle2}
          accentColor="blue"
        />
        <StatCard
          label="Scheduled Classes"
          value={snapshot.classes.length}
          subtext="Active cohort sessions"
          icon={Calendar}
          accentColor="amber"
        />
        <StatCard
          label="Community Q&A"
          value={snapshot.questions.length}
          subtext={`${snapshot.answers.length} verified responses`}
          icon={TrendingUp}
          accentColor="purple"
        />
      </div>

      {/* Courses in Progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Available Courses</h2>
          <button
            onClick={() => onNavigateTab('learn')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Browse All &rarr;
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {snapshot.courses.map((course) => {
            const courseLessons = snapshot.lessons.filter(l => {
              const subj = snapshot.subjects.find(s => s.uuid === l.subjectUuid);
              return subj?.courseUuid === course.uuid;
            });
            const completedInCourse = courseLessons.filter(l =>
              snapshot.progress.some(p => p.lessonUuid === l.uuid && p.status === 'completed')
            ).length;
            const pct = courseLessons.length > 0 ? Math.round((completedInCourse / courseLessons.length) * 100) : 0;

            return (
              <div
                key={course.uuid}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-emerald-300 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                        {course.code}
                      </span>
                      <h3 className="font-bold text-slate-900 text-base mt-0.5">{course.title}</h3>
                    </div>
                    <span className="text-xs font-bold text-emerald-800 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                      {pct}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {course.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {courseLessons.length} lessons &bull; {course.author}
                  </span>
                  <button
                    onClick={() => {
                      const first = courseLessons[0];
                      if (first) onOpenLesson(first.uuid);
                      else onNavigateTab('learn');
                    }}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <span>Open</span>
                    <Play className="w-3 h-3 fill-emerald-700" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Scheduled Classes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Upcoming Scheduled Classes</h2>
          <button
            onClick={() => onNavigateTab('classes')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
          >
            View Schedule &rarr;
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {snapshot.classes.slice(0, 2).map((cls) => (
            <div
              key={cls.uuid}
              className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{cls.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{cls.scheduleText}</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Active
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

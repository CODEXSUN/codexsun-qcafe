import React, { useState } from 'react';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Clock,
  HelpCircle,
  Play,
  RotateCcw,
  Sparkles,
  XCircle,
} from 'lucide-react';
import type { LearningQuizQuestion, LearningTest, NeotSnapshot } from '../types.js';
import { submitQuizAttempt } from '../api.js';

interface TestsViewProps {
  snapshot: NeotSnapshot;
  onRefresh: () => void;
  userEmail: string;
}

export function TestsView({ snapshot, onRefresh, userEmail }: TestsViewProps) {
  const [activeTestUuid, setActiveTestUuid] = useState<string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [lastResult, setLastResult] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeTest = snapshot.tests.find(t => t.uuid === activeTestUuid);
  const activeQuestions = snapshot.quizQuestions.filter(q => q.testUuid === activeTestUuid);

  const handleStartTest = (testUuid: string) => {
    setActiveTestUuid(testUuid);
    setSelectedAnswers({});
    setLastResult(null);
  };

  const handleOptionSelect = (questionUuid: string, option: string) => {
    setSelectedAnswers(prev => ({ ...prev, [questionUuid]: option }));
  };

  const handleSubmit = async () => {
    if (!activeTest) return;
    setIsSubmitting(true);
    try {
      const result = await submitQuizAttempt(activeTest.uuid, selectedAnswers, userEmail);
      setLastResult(result);
      onRefresh();
    } catch (err) {
      alert('Error submitting test: ' + err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-xl md:text-2xl font-black text-slate-900">Assessments & Quizzes</h1>
        <p className="text-xs text-slate-500 mt-1">
          Take measured knowledge checks, evaluate your comprehension, and build verified learning evidence.
        </p>
      </div>

      {activeTest ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                Assessment in Progress
              </span>
              <h2 className="text-lg md:text-xl font-bold text-slate-900 mt-0.5">{activeTest.title}</h2>
              <p className="text-xs text-slate-500 mt-1">{activeTest.instructions}</p>
            </div>
            <button
              onClick={() => setActiveTestUuid(null)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Exit Quiz
            </button>
          </div>

          {/* Result View */}
          {lastResult ? (
            <div className="p-6 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-4 text-center max-w-lg mx-auto">
              <div className="inline-flex p-3 rounded-full bg-emerald-100 text-emerald-700">
                {lastResult.passed ? (
                  <Award className="w-8 h-8" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-amber-600" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {lastResult.passed ? 'Congratulations! You Passed!' : 'Review & Try Again'}
                </h3>
                <p className="text-2xl font-black text-emerald-800 mt-1">
                  {lastResult.percentage}% Score
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  You earned {lastResult.score} out of {lastResult.totalPoints} points. Pass requirement: {activeTest.passPercentage}%.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  onClick={() => handleStartTest(activeTest.uuid)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake Quiz</span>
                </button>
                <button
                  onClick={() => setActiveTestUuid(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs"
                >
                  Back to Assessments
                </button>
              </div>
            </div>
          ) : (
            /* Question-by-Question Form */
            <div className="space-y-6">
              {activeQuestions.map((q, idx) => (
                <div key={q.uuid} className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      Question {idx + 1}. {q.prompt}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap">
                      {q.points} pt{q.points > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="space-y-2 pt-1">
                    {q.options.map((opt) => {
                      const isSelected = selectedAnswers[q.uuid] === opt;
                      return (
                        <label
                          key={opt}
                          onClick={() => handleOptionSelect(q.uuid, opt)}
                          className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q_${q.uuid}`}
                            checked={isSelected}
                            onChange={() => handleOptionSelect(q.uuid, opt)}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  onClick={() => setActiveTestUuid(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || Object.keys(selectedAnswers).length < activeQuestions.length}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50 shadow-xs"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isSubmitting ? 'Evaluating...' : 'Submit Answers'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Test Catalog */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {snapshot.tests.map((test) => {
            const course = snapshot.courses.find(c => c.uuid === test.courseUuid);
            const questions = snapshot.quizQuestions.filter(q => q.testUuid === test.uuid);
            const userAttempts = snapshot.attempts.filter(
              a => a.testUuid === test.uuid && a.studentEmail === userEmail
            );
            const bestAttempt = userAttempts.sort((a, b) => b.percentage - a.percentage)[0];

            return (
              <div
                key={test.uuid}
                className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                        {course?.title ?? 'Course Assessment'}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5">{test.title}</h3>
                    </div>
                    {bestAttempt && (
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                          bestAttempt.passed
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {bestAttempt.percentage}% Best
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">{test.instructions}</p>
                  <p className="text-[11px] text-slate-400 mt-3">
                    {questions.length} questions &bull; Pass rate required: {test.passPercentage}%
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {userAttempts.length} attempt{userAttempts.length !== 1 ? 's' : ''} recorded
                  </span>
                  <button
                    onClick={() => handleStartTest(test.uuid)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>{userAttempts.length > 0 ? 'Retake' : 'Start Test'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

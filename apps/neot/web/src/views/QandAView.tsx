import React, { useState } from 'react';
import {
  Check,
  CheckCircle,
  HelpCircle,
  MessageSquare,
  Plus,
  Send,
  User,
} from 'lucide-react';
import type { NeotSnapshot } from '../types.js';
import { acceptAnswer, answerQuestion, askQuestion } from '../api.js';

interface QandAViewProps {
  snapshot: NeotSnapshot;
  onRefresh: () => void;
  userEmail: string;
  userRole: 'student' | 'master';
}

export function QandAView({ snapshot, onRefresh, userEmail, userRole }: QandAViewProps) {
  const [selectedLessonUuid, setSelectedLessonUuid] = useState<string>('all');
  const [showAskModal, setShowAskModal] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [targetLessonUuid, setTargetLessonUuid] = useState(snapshot.lessons[0]?.uuid ?? '');
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});

  const filteredQuestions = selectedLessonUuid === 'all'
    ? snapshot.questions
    : snapshot.questions.filter(q => q.lessonUuid === selectedLessonUuid);

  const handleAskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim() || !targetLessonUuid) return;
    try {
      await askQuestion(targetLessonUuid, newQuestionText.trim(), userEmail);
      setNewQuestionText('');
      setShowAskModal(false);
      onRefresh();
    } catch (err) {
      alert('Error: ' + err);
    }
  };

  const handleAnswerSubmit = async (questionUuid: string) => {
    const text = answerDrafts[questionUuid]?.trim();
    if (!text) return;
    try {
      await answerQuestion(questionUuid, text, userEmail);
      setAnswerDrafts(prev => ({ ...prev, [questionUuid]: '' }));
      onRefresh();
    } catch (err) {
      alert('Error submitting answer: ' + err);
    }
  };

  const handleAccept = async (answerUuid: string, questionUuid: string) => {
    try {
      await acceptAnswer(answerUuid, questionUuid, userEmail);
      onRefresh();
    } catch (err) {
      alert('Error accepting answer: ' + err);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900">Student & Master Q&A</h1>
          <p className="text-xs text-slate-500 mt-1">
            Ask doubts, share answers, and review verified solutions from teaching masters.
          </p>
        </div>

        <button
          onClick={() => setShowAskModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Ask Question</span>
        </button>
      </div>

      {/* Filter by lesson */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedLessonUuid('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            selectedLessonUuid === 'all'
              ? 'bg-emerald-800 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Lessons ({snapshot.questions.length})
        </button>
        {snapshot.lessons.map(l => (
          <button
            key={l.uuid}
            onClick={() => setSelectedLessonUuid(l.uuid)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedLessonUuid === l.uuid
                ? 'bg-emerald-800 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {l.title}
          </button>
        ))}
      </div>

      {/* Question Cards */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
            No questions found for this selection.
          </div>
        ) : (
          filteredQuestions.map(q => {
            const lesson = snapshot.lessons.find(l => l.uuid === q.lessonUuid);
            const answers = snapshot.answers.filter(a => a.questionUuid === q.uuid);

            return (
              <div key={q.uuid} className="bg-white rounded-3xl border border-slate-200/80 p-5 md:p-6 shadow-xs space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                      {lesson?.title ?? 'Lesson'}
                    </span>
                    <h3 className="text-sm md:text-base font-bold text-slate-900 flex items-start gap-2">
                      <HelpCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span>{q.questionText}</span>
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">Asked by {q.askedBy}</span>
                </div>

                {/* Answers list */}
                <div className="space-y-3 pt-2">
                  {answers.map(a => (
                    <div
                      key={a.uuid}
                      className={`p-3.5 rounded-2xl border text-xs space-y-1.5 transition-all ${
                        a.accepted
                          ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                          : 'bg-slate-50/70 border-slate-200/70 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[11px] text-slate-900 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {a.answeredBy}
                        </span>
                        {a.accepted ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            Accepted Solution
                          </span>
                        ) : userRole === 'master' ? (
                          <button
                            onClick={() => handleAccept(a.uuid, q.uuid)}
                            className="text-[10px] font-bold text-slate-500 hover:text-emerald-700 flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>Mark Accepted</span>
                          </button>
                        ) : null}
                      </div>
                      <p className="leading-relaxed">{a.answerText}</p>
                    </div>
                  ))}

                  {/* Add Answer Box */}
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      value={answerDrafts[q.uuid] ?? ''}
                      onChange={(e) => setAnswerDrafts(prev => ({ ...prev, [q.uuid]: e.target.value }))}
                      placeholder="Write your answer..."
                      className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      onClick={() => handleAnswerSubmit(q.uuid)}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1 shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Answer</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Ask Question Modal */}
      {showAskModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Ask a Question</h3>
            <form onSubmit={handleAskSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Related Lesson</label>
                <select
                  value={targetLessonUuid}
                  onChange={(e) => setTargetLessonUuid(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                >
                  {snapshot.lessons.map(l => (
                    <option key={l.uuid} value={l.uuid}>{l.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Your Question</label>
                <textarea
                  rows={3}
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  placeholder="Explain what you are trying to understand..."
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAskModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs"
                >
                  Post Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle,
  Circle,
  Code2,
  FileText,
  HelpCircle,
  MessageSquare,
  Send,
  UploadCloud,
} from 'lucide-react';
import type { NeotSnapshot } from '../types.js';
import { recordLessonProgress, askQuestion, submitAssignment } from '../api.js';
import { CodeSandbox } from '../components/CodeSandbox.js';

interface LearnViewProps {
  snapshot: NeotSnapshot;
  activeLessonUuid: string | null;
  onSelectLesson: (uuid: string) => void;
  onRefresh: () => void;
  userEmail: string;
}

export function LearnView({
  snapshot,
  activeLessonUuid,
  onSelectLesson,
  onRefresh,
  userEmail,
}: LearnViewProps) {
  const [selectedCourseUuid, setSelectedCourseUuid] = useState<string>(
    snapshot.courses[0]?.uuid ?? ''
  );
  const [questionInput, setQuestionInput] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'content' | 'sandbox' | 'assignment' | 'discussion'>('content');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignmentContent, setAssignmentContent] = useState('');
  const [assignmentAttachment, setAssignmentAttachment] = useState('');

  // Active lesson
  const currentLesson = snapshot.lessons.find(l => l.uuid === activeLessonUuid) || snapshot.lessons[0];
  const currentSubject = snapshot.subjects.find(s => s.uuid === currentLesson?.subjectUuid);
  const currentCourse = snapshot.courses.find(c => c.uuid === currentSubject?.courseUuid) || snapshot.courses[0];

  const isCompleted = snapshot.progress.some(
    p => p.lessonUuid === currentLesson?.uuid && p.status === 'completed'
  );

  // Filter lessons for course
  const courseSubjects = snapshot.subjects.filter(s => s.courseUuid === (selectedCourseUuid || currentCourse?.uuid));

  const handleToggleCompleted = async () => {
    if (!currentLesson) return;
    try {
      const nextStatus = isCompleted ? 'viewed' : 'completed';
      await recordLessonProgress(currentLesson.uuid, nextStatus, userEmail);
      onRefresh();
    } catch (err) {
      alert('Failed to update progress: ' + err);
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionInput.trim() || !currentLesson) return;
    setIsSubmitting(true);
    try {
      await askQuestion(currentLesson.uuid, questionInput.trim(), userEmail);
      setQuestionInput('');
      onRefresh();
      alert('Question posted to study board!');
    } catch (err) {
      alert('Failed to post question: ' + err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Find next and previous lessons in the course
  const allCourseLessons = snapshot.lessons.filter(l => {
    const s = snapshot.subjects.find(sub => sub.uuid === l.subjectUuid);
    return s?.courseUuid === currentCourse?.uuid;
  });
  const currentIndex = allCourseLessons.findIndex(l => l.uuid === currentLesson?.uuid);
  const prevLesson = currentIndex > 0 ? allCourseLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < allCourseLessons.length - 1 ? allCourseLessons[currentIndex + 1] : null;

  // Lesson questions
  const lessonQuestions = snapshot.questions.filter(q => q.lessonUuid === currentLesson?.uuid);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20 md:pb-6">
      {/* Course Outline & Curriculum Sidebar */}
      <div className="lg:col-span-4 space-y-4">
        {/* Course Switcher */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
            Selected Course
          </label>
          <select
            value={selectedCourseUuid || currentCourse?.uuid}
            onChange={(e) => setSelectedCourseUuid(e.target.value)}
            className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {snapshot.courses.map(c => (
              <option key={c.uuid} value={c.uuid}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        {/* Subjects & Lessons Tree */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-4 max-h-[70vh] overflow-y-auto">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Curriculum Hierarchy
          </h3>

          {courseSubjects.map((subject) => {
            const subjectLessons = snapshot.lessons.filter(l => l.subjectUuid === subject.uuid);
            return (
              <div key={subject.uuid} className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 px-2 py-1">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{subject.title}</span>
                </div>

                <div className="space-y-1 pl-3 border-l-2 border-slate-100 ml-3">
                  {subjectLessons.map((lesson) => {
                    const isSelected = lesson.uuid === currentLesson?.uuid;
                    const isDone = snapshot.progress.some(
                      p => p.lessonUuid === lesson.uuid && p.status === 'completed'
                    );

                    return (
                      <button
                        key={lesson.uuid}
                        onClick={() => onSelectLesson(lesson.uuid)}
                        className={`w-full text-left flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs transition-all ${
                          isSelected
                            ? 'bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {isDone ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                          )}
                          <span className="truncate">{lesson.title}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lesson Content Viewer */}
      <div className="lg:col-span-8 space-y-4">
        {currentLesson ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Lesson Header */}
            <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    {currentSubject?.title}
                  </span>
                  <h1 className="text-xl md:text-2xl font-black text-slate-900 mt-1">
                    {currentLesson.title}
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">
                    Author: {currentLesson.author || 'Instructor'} &bull; Step {currentLesson.position}
                  </p>
                </div>

                <button
                  onClick={handleToggleCompleted}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                    isCompleted
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-800'
                  }`}
                >
                  {isCompleted ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Completed</span>
                    </>
                  ) : (
                    <>
                      <Circle className="w-4 h-4 text-slate-400" />
                      <span>Mark Complete</span>
                    </>
                  )}
                </button>
              </div>

              {/* Sub-tabs: Lesson vs Sandbox vs Assignment vs Discussion */}
              <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-200/60 overflow-x-auto">
                <button
                  onClick={() => setActiveSubTab('content')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                    activeSubTab === 'content'
                      ? 'bg-emerald-800 text-white'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Lesson Notes</span>
                </button>
                <button
                  onClick={() => setActiveSubTab('sandbox')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                    activeSubTab === 'sandbox'
                      ? 'bg-emerald-800 text-white'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Code Sandbox</span>
                </button>
                <button
                  onClick={() => setActiveSubTab('assignment')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                    activeSubTab === 'assignment'
                      ? 'bg-emerald-800 text-white'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Assignments ({snapshot.assignments?.filter(a => a.lessonUuid === currentLesson?.uuid).length || 0})</span>
                </button>
                <button
                  onClick={() => setActiveSubTab('discussion')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                    activeSubTab === 'discussion'
                      ? 'bg-emerald-800 text-white'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Lesson Q&A ({lessonQuestions.length})</span>
                </button>
              </div>
            </div>

            {/* Sub-tab Body */}
            {activeSubTab === 'sandbox' && (
              <div className="p-6 md:p-8">
                <CodeSandbox
                  onExportCode={(bundle) => {
                    setAssignmentContent(bundle);
                    setActiveSubTab('assignment');
                  }}
                />
              </div>
            )}

            {activeSubTab === 'assignment' && (
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800">Lesson Evidence & Tasks</h3>
                  <span className="text-xs text-slate-500">Submit work for mentor review</span>
                </div>

                {(!snapshot.assignments || snapshot.assignments.filter(a => a.lessonUuid === currentLesson?.uuid).length === 0) ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                    <p className="text-xs text-slate-500">No formal assignments attached to this lesson yet.</p>
                  </div>
                ) : (
                  snapshot.assignments
                    .filter(a => a.lessonUuid === currentLesson?.uuid)
                    .map((assignment) => {
                      const submission = snapshot.submissions?.find(
                        s => s.assignmentUuid === assignment.uuid && s.studentEmail === userEmail
                      );

                      return (
                        <div key={assignment.uuid} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                          <div className="flex items-start justify-between flex-wrap gap-2">
                            <div>
                              <h4 className="text-sm font-bold text-slate-900">{assignment.title}</h4>
                              <p className="text-xs text-slate-600 mt-1">{assignment.description}</p>
                            </div>
                            <span className="text-xs font-semibold px-2.5 py-1 bg-teal-100 text-teal-800 rounded-lg">
                              Max Points: {assignment.maxPoints}
                            </span>
                          </div>

                          {submission ? (
                            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-700">Your Submission</span>
                                <span className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded ${
                                  submission.status === 'reviewed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {submission.status}
                                </span>
                              </div>
                              {submission.score !== null && (
                                <div className="text-xs font-bold text-emerald-700">
                                  Grade: {submission.score} / {assignment.maxPoints} pts
                                </div>
                              )}
                              {submission.feedback && (
                                <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                  Mentor Feedback: &ldquo;{submission.feedback}&rdquo; ({submission.reviewedBy})
                                </p>
                              )}
                              <div className="text-[11px] font-mono text-slate-500 truncate bg-slate-100 p-2 rounded">
                                {submission.content}
                              </div>
                            </div>
                          ) : (
                            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                              <h5 className="text-xs font-bold text-slate-700">Submit Project Artifact / Solution</h5>
                              <textarea
                                rows={3}
                                value={assignmentContent}
                                onChange={e => setAssignmentContent(e.target.value)}
                                placeholder="Paste your HTML/CSS/JS code bundle or solution notes here..."
                                className="w-full text-xs font-mono p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                              />
                              <input
                                type="url"
                                value={assignmentAttachment}
                                onChange={e => setAssignmentAttachment(e.target.value)}
                                placeholder="Optional: GitHub repo link or hosted URL (e.g. https://...)"
                                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                              />
                              <button
                                onClick={async () => {
                                  if (!assignmentContent.trim()) {
                                    alert('Please input code or summary before submitting.');
                                    return;
                                  }
                                  setIsSubmitting(true);
                                  try {
                                    await submitAssignment(assignment.uuid, assignmentContent.trim(), assignmentAttachment.trim(), userEmail);
                                    alert('Assignment submitted successfully!');
                                    setAssignmentContent('');
                                    setAssignmentAttachment('');
                                    onRefresh();
                                  } catch (err) {
                                    alert('Failed to submit assignment: ' + err);
                                  } finally {
                                    setIsSubmitting(false);
                                  }
                                }}
                                disabled={isSubmitting || !assignmentContent.trim()}
                                className="flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50"
                              >
                                <UploadCloud className="w-3.5 h-3.5" />
                                <span>Submit for Grading</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
              </div>
            )}

            {activeSubTab === 'content' && (
              <div className="p-6 md:p-8 space-y-4">
                <div className="prose prose-slate max-w-none text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {currentLesson.content}
                </div>

                {/* Lesson Navigation Footer */}
                <div className="pt-8 border-t border-slate-100 flex items-center justify-between">
                  {prevLesson ? (
                    <button
                      onClick={() => onSelectLesson(prevLesson.uuid)}
                      className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-emerald-700"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Previous: {prevLesson.title}</span>
                    </button>
                  ) : <div />}

                  {nextLesson && (
                    <button
                      onClick={() => onSelectLesson(nextLesson.uuid)}
                      className="flex items-center gap-2 text-xs font-bold text-emerald-700 hover:text-emerald-800"
                    >
                      <span>Next: {nextLesson.title}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeSubTab === 'discussion' && (
              <div className="p-6 md:p-8 space-y-6">
                {/* Ask a Question for this lesson */}
                <form onSubmit={handleAskQuestion} className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                  <h4 className="text-xs font-bold text-slate-700">Ask about this lesson</h4>
                  <textarea
                    rows={2}
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    placeholder="Type your question or doubt here..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !questionInput.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Question</span>
                  </button>
                </form>

                {/* Question List */}
                <div className="space-y-4">
                  {lessonQuestions.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">
                      No questions asked yet for this lesson. Be the first to ask!
                    </p>
                  ) : (
                    lessonQuestions.map((q) => {
                      const answers = snapshot.answers.filter(a => a.questionUuid === q.uuid);
                      return (
                        <div key={q.uuid} className="p-4 rounded-2xl border border-slate-200/80 bg-white space-y-2.5">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <HelpCircle className="w-4 h-4 text-emerald-600" />
                              <span className="text-xs font-bold text-slate-900">{q.questionText}</span>
                            </div>
                            <span className="text-[10px] text-slate-400">{q.askedBy}</span>
                          </div>

                          {answers.map((ans) => (
                            <div key={ans.uuid} className="pl-6 border-l-2 border-emerald-500 space-y-1">
                              <p className="text-xs text-slate-700">{ans.answerText}</p>
                              <span className="text-[10px] text-emerald-700 font-semibold">&mdash; {ans.answeredBy} (Verified Master)</span>
                            </div>
                          ))}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
            Select a lesson from the curriculum outline on the left to start learning.
          </div>
        )}
      </div>
    </div>
  );
}

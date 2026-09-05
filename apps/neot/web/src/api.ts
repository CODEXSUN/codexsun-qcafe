import type {
  DiscussionPost,
  LearningAnswer,
  LearningAssignment,
  LearningAttendanceRecord,
  LearningAttendanceSession,
  LearningCertificate,
  LearningCourse,
  LearningLesson,
  LearningQuestion,
  LearningSubmission,
  LessonProgress,
  NeotSnapshot,
  SyncStatusSummary,
} from './types.js';

const API_BASE = '/api/v1/neot';

function getHeaders(actorEmail?: string): HeadersInit {
  const token = localStorage.getItem('neot_session_token') || localStorage.getItem('neot_api_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (actorEmail) headers['X-Actor-Email'] = actorEmail;
  return headers;
}

export async function fetchSnapshot(actorEmail?: string): Promise<NeotSnapshot> {
  const res = await fetch(`${API_BASE}/snapshot`, {
    headers: getHeaders(actorEmail),
  });
  if (!res.ok) throw new Error(`Snapshot request failed: ${res.statusText}`);
  return res.json();
}

export async function recordLessonProgress(
  lessonUuid: string,
  status: 'completed' | 'viewed',
  actorEmail?: string
): Promise<LessonProgress> {
  const res = await fetch(`${API_BASE}/lessons/${lessonUuid}/progress`, {
    method: 'PUT',
    headers: getHeaders(actorEmail),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(`Failed to update progress: ${res.statusText}`);
  return res.json();
}

export async function submitQuizAttempt(
  testUuid: string,
  answers: Record<string, string>,
  actorEmail?: string
) {
  const res = await fetch(`${API_BASE}/tests/${testUuid}/attempts`, {
    method: 'POST',
    headers: getHeaders(actorEmail),
    body: JSON.stringify({ answers }),
  });
  if (!res.ok) throw new Error(`Failed to submit quiz attempt: ${res.statusText}`);
  return res.json();
}

export async function askQuestion(
  lessonUuid: string,
  questionText: string,
  actorEmail?: string
): Promise<LearningQuestion> {
  const res = await fetch(`${API_BASE}/questions`, {
    method: 'POST',
    headers: getHeaders(actorEmail),
    body: JSON.stringify({ lessonUuid, questionText }),
  });
  if (!res.ok) throw new Error(`Failed to ask question: ${res.statusText}`);
  return res.json();
}

export async function answerQuestion(
  questionUuid: string,
  answerText: string,
  actorEmail?: string
): Promise<LearningAnswer> {
  const res = await fetch(`${API_BASE}/answers`, {
    method: 'POST',
    headers: getHeaders(actorEmail),
    body: JSON.stringify({ questionUuid, answerText }),
  });
  if (!res.ok) throw new Error(`Failed to submit answer: ${res.statusText}`);
  return res.json();
}

export async function acceptAnswer(
  answerUuid: string,
  questionUuid: string,
  actorEmail?: string
): Promise<LearningAnswer> {
  const res = await fetch(`${API_BASE}/answers/${answerUuid}/accept`, {
    method: 'POST',
    headers: getHeaders(actorEmail),
    body: JSON.stringify({ questionUuid }),
  });
  if (!res.ok) throw new Error(`Failed to accept answer: ${res.statusText}`);
  return res.json();
}

export async function fetchDiscussions(lessonUuid: string): Promise<DiscussionPost[]> {
  const res = await fetch(`${API_BASE}/lessons/${lessonUuid}/discussion`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to load discussion: ${res.statusText}`);
  const json = await res.json();
  return json.discussions ?? [];
}

export async function postDiscussion(
  lessonUuid: string,
  body: string,
  author?: string,
  parentUuid?: string | null
): Promise<DiscussionPost> {
  const res = await fetch(`${API_BASE}/lessons/${lessonUuid}/discussion`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ body, author, parentUuid }),
  });
  if (!res.ok) throw new Error(`Failed to post discussion: ${res.statusText}`);
  return res.json();
}

export async function createCourse(data: {
  title: string;
  description?: string;
  author?: string;
  theme?: string;
}): Promise<LearningCourse> {
  const res = await fetch(`${API_BASE}/courses`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create course: ${res.statusText}`);
  return res.json();
}

export async function createLesson(data: {
  subjectUuid: string;
  title: string;
  content?: string;
  author?: string;
}): Promise<LearningLesson> {
  const res = await fetch(`${API_BASE}/lessons`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create lesson: ${res.statusText}`);
  return res.json();
}

// Sync endpoints
export async function getSyncStatus(): Promise<SyncStatusSummary> {
  const res = await fetch(`${API_BASE}/sync/status`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to get sync status: ${res.statusText}`);
  return res.json();
}

export async function checkCloudHealth(): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(`${API_BASE}/sync/health`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Health check request failed`);
  return res.json();
}

export async function pullFromCloud(token?: string) {
  const res = await fetch(`${API_BASE}/sync/pull`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ token }),
  });
  return res.json();
}

export async function pushToCloud(token?: string) {
  const res = await fetch(`${API_BASE}/sync/push`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ token }),
  });
  return res.json();
}

// Assignments
export async function submitAssignment(
  assignmentUuid: string,
  content: string,
  attachmentUrl?: string,
  actorEmail?: string
): Promise<LearningSubmission> {
  const res = await fetch(`${API_BASE}/assignments/${assignmentUuid}/submissions`, {
    method: 'POST',
    headers: getHeaders(actorEmail),
    body: JSON.stringify({ content, attachmentUrl }),
  });
  if (!res.ok) throw new Error(`Failed to submit assignment: ${res.statusText}`);
  return res.json();
}

export async function reviewSubmission(
  submissionUuid: string,
  score: number,
  feedback: string,
  reviewer?: string
): Promise<LearningSubmission> {
  const res = await fetch(`${API_BASE}/submissions/${submissionUuid}/review`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ score, feedback, reviewer }),
  });
  if (!res.ok) throw new Error(`Failed to review submission: ${res.statusText}`);
  return res.json();
}

// Attendance
export async function createAttendanceSession(
  classUuid: string,
  data: { sessionDate?: string; topic?: string; createdBy?: string }
): Promise<LearningAttendanceSession> {
  const res = await fetch(`${API_BASE}/classes/${classUuid}/attendance/sessions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create attendance session: ${res.statusText}`);
  return res.json();
}

export async function recordAttendance(
  sessionUuid: string,
  records: Array<{ studentEmail: string; status: 'present' | 'late' | 'absent' | 'excused'; notes?: string }>
): Promise<LearningAttendanceRecord[]> {
  const res = await fetch(`${API_BASE}/attendance/sessions/${sessionUuid}/records`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ records }),
  });
  if (!res.ok) throw new Error(`Failed to record attendance: ${res.statusText}`);
  return res.json();
}

// Certificates
export async function claimCertificate(
  courseUuid: string,
  gradePercentage?: number,
  actorEmail?: string
): Promise<LearningCertificate> {
  const res = await fetch(`${API_BASE}/courses/${courseUuid}/certificates/claim`, {
    method: 'POST',
    headers: getHeaders(actorEmail),
    body: JSON.stringify({ gradePercentage }),
  });
  if (!res.ok) throw new Error(`Failed to claim certificate: ${res.statusText}`);
  return res.json();
}

export async function getCertificate(code: string): Promise<LearningCertificate> {
  const res = await fetch(`${API_BASE}/certificates/${code}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to fetch certificate: ${res.statusText}`);
  return res.json();
}

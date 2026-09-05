export type CourseTheme = 'berry' | 'forest' | 'ocean' | 'slate' | 'sunrise';

export type BaseRecord = {
  id: number;
  uuid: string;
  createdAt: string;
  updatedAt: string;
};

export type LearningCourse = BaseRecord & {
  code: string;
  title: string;
  description: string;
  author: string;
  coverImage: string;
  theme: CourseTheme;
  position: number;
  status: 'active' | 'archived' | 'draft';
};

export type LearningSubject = BaseRecord & {
  courseUuid: string;
  title: string;
  description: string;
  position: number;
};

export type LearningLesson = BaseRecord & {
  subjectUuid: string;
  title: string;
  content: string;
  author: string;
  position: number;
  status: 'draft' | 'published' | 'archived';
};

export type LearningClass = BaseRecord & {
  courseUuid: string;
  title: string;
  masterEmail: string;
  scheduleText: string;
  status: 'active' | 'completed' | 'scheduled';
};

export type LearningEnrollment = BaseRecord & {
  courseUuid: string;
  classUuid: string | null;
  memberEmail: string;
  memberName: string;
  role: 'master' | 'student';
  status: 'active' | 'dropped';
};

export type LearningQuestion = BaseRecord & {
  lessonUuid: string;
  askedBy: string;
  questionText: string;
  status: 'answered' | 'closed' | 'open';
};

export type LearningAnswer = BaseRecord & {
  questionUuid: string;
  answeredBy: string;
  answerText: string;
  accepted: boolean;
};

export type LearningTest = BaseRecord & {
  courseUuid: string;
  lessonUuid: string | null;
  title: string;
  instructions: string;
  passPercentage: number;
  status: 'active' | 'draft';
};

export type LearningQuizQuestion = BaseRecord & {
  testUuid: string;
  prompt: string;
  options: string[];
  points: number;
  position: number;
};

export type LearningAttempt = {
  id: number;
  uuid: string;
  testUuid: string;
  studentEmail: string;
  answers: Record<string, string>;
  score: number;
  totalPoints: number;
  percentage: number;
  passed: boolean;
  completedAt: string;
};

export type LessonProgress = {
  id: number;
  uuid: string;
  lessonUuid: string;
  studentEmail: string;
  status: 'completed' | 'viewed';
  lastOpenedAt: string;
  completedAt: string | null;
};

export type DiscussionPost = {
  id: number;
  uuid: string;
  lessonUuid: string;
  parentUuid: string | null;
  author: string;
  body: string;
  createdAt: string;
};

export type StudentPerformance = {
  studentEmail: string;
  attempts: number;
  averagePercentage: number;
  bestPercentage: number;
};

export type LearningAssignment = BaseRecord & {
  lessonUuid: string;
  title: string;
  description: string;
  maxPoints: number;
};

export type LearningSubmission = BaseRecord & {
  assignmentUuid: string;
  studentEmail: string;
  content: string;
  attachmentUrl: string;
  status: 'draft' | 'submitted' | 'reviewed';
  score: number | null;
  feedback: string | null;
  reviewedBy: string | null;
  submittedAt: string;
  reviewedAt: string | null;
};

export type LearningAttendanceSession = BaseRecord & {
  classUuid: string;
  sessionDate: string;
  topic: string;
  createdBy: string;
};

export type LearningAttendanceRecord = BaseRecord & {
  sessionUuid: string;
  studentEmail: string;
  status: 'present' | 'late' | 'absent' | 'excused';
  notes: string;
};

export type LearningCertificate = {
  id: number;
  uuid: string;
  courseUuid: string;
  studentEmail: string;
  certificateCode: string;
  gradePercentage: number;
  issuedAt: string;
  verificationHash: string;
};

export type NeotSnapshot = {
  courses: LearningCourse[];
  subjects: LearningSubject[];
  lessons: LearningLesson[];
  classes: LearningClass[];
  enrollments: LearningEnrollment[];
  questions: LearningQuestion[];
  answers: LearningAnswer[];
  tests: LearningTest[];
  quizQuestions: LearningQuizQuestion[];
  attempts: LearningAttempt[];
  progress: LessonProgress[];
  discussions: DiscussionPost[];
  assignments?: LearningAssignment[];
  submissions?: LearningSubmission[];
  attendanceSessions?: LearningAttendanceSession[];
  attendanceRecords?: LearningAttendanceRecord[];
  certificates?: LearningCertificate[];
  performance: StudentPerformance[];
};

export type SyncStatusSummary = {
  instanceId: string;
  cloudUrl: string;
  role: 'cloud' | 'disabled' | 'local';
  status: 'conflict' | 'disabled' | 'error' | 'ready' | 'syncing';
  lastPulledAt: string | null;
  lastPublishedAt: string | null;
  lastVerifiedAt: string | null;
  pendingChangesCount: number;
  remoteRevision: number;
  lastError: string | null;
};

-- NEOT LMS initial database migration
-- Relational schema for study management, courses, lessons, quizzes, discussions, and sync

CREATE TABLE IF NOT EXISTS neot_courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT '',
  cover_image TEXT NOT NULL DEFAULT '',
  theme TEXT NOT NULL DEFAULT 'forest',
  position INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  sync_id TEXT NOT NULL DEFAULT '',
  sync_status TEXT NOT NULL DEFAULT 'local',
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS neot_subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  course_uuid TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  sync_id TEXT NOT NULL DEFAULT '',
  sync_status TEXT NOT NULL DEFAULT 'local',
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (course_uuid) REFERENCES neot_courses(uuid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS neot_lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  subject_uuid TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published',
  sync_id TEXT NOT NULL DEFAULT '',
  sync_status TEXT NOT NULL DEFAULT 'local',
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (subject_uuid) REFERENCES neot_subjects(uuid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS neot_classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  course_uuid TEXT NOT NULL,
  title TEXT NOT NULL,
  master_email TEXT NOT NULL DEFAULT '',
  schedule_text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'scheduled',
  sync_id TEXT NOT NULL DEFAULT '',
  sync_status TEXT NOT NULL DEFAULT 'local',
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (course_uuid) REFERENCES neot_courses(uuid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS neot_enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  course_uuid TEXT NOT NULL,
  class_uuid TEXT,
  member_email TEXT NOT NULL,
  member_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'student',
  status TEXT NOT NULL DEFAULT 'active',
  sync_id TEXT NOT NULL DEFAULT '',
  sync_status TEXT NOT NULL DEFAULT 'local',
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (course_uuid) REFERENCES neot_courses(uuid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS neot_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  lesson_uuid TEXT NOT NULL,
  asked_by TEXT NOT NULL,
  question_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  sync_id TEXT NOT NULL DEFAULT '',
  sync_status TEXT NOT NULL DEFAULT 'local',
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lesson_uuid) REFERENCES neot_lessons(uuid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS neot_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  question_uuid TEXT NOT NULL,
  answered_by TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  accepted INTEGER NOT NULL DEFAULT 0,
  sync_id TEXT NOT NULL DEFAULT '',
  sync_status TEXT NOT NULL DEFAULT 'local',
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (question_uuid) REFERENCES neot_questions(uuid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS neot_tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  course_uuid TEXT NOT NULL,
  lesson_uuid TEXT,
  title TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  pass_percentage INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'active',
  sync_id TEXT NOT NULL DEFAULT '',
  sync_status TEXT NOT NULL DEFAULT 'local',
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (course_uuid) REFERENCES neot_courses(uuid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS neot_quiz_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  test_uuid TEXT NOT NULL,
  prompt TEXT NOT NULL,
  options_json TEXT NOT NULL DEFAULT '[]',
  correct_option TEXT NOT NULL DEFAULT '',
  points INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0,
  sync_id TEXT NOT NULL DEFAULT '',
  sync_status TEXT NOT NULL DEFAULT 'local',
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (test_uuid) REFERENCES neot_tests(uuid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS neot_quiz_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  test_uuid TEXT NOT NULL,
  student_email TEXT NOT NULL,
  answers_json TEXT NOT NULL DEFAULT '{}',
  score INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  percentage INTEGER NOT NULL DEFAULT 0,
  passed INTEGER NOT NULL DEFAULT 0,
  sync_id TEXT NOT NULL DEFAULT '',
  sync_status TEXT NOT NULL DEFAULT 'local',
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (test_uuid) REFERENCES neot_tests(uuid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS neot_lesson_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  lesson_uuid TEXT NOT NULL,
  student_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'viewed',
  sync_id TEXT NOT NULL DEFAULT '',
  sync_status TEXT NOT NULL DEFAULT 'local',
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_opened_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (lesson_uuid) REFERENCES neot_lessons(uuid) ON DELETE CASCADE,
  UNIQUE(lesson_uuid, student_email)
);

CREATE TABLE IF NOT EXISTS neot_discussions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  lesson_uuid TEXT NOT NULL,
  parent_uuid TEXT,
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  sync_id TEXT NOT NULL DEFAULT '',
  sync_status TEXT NOT NULL DEFAULT 'local',
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lesson_uuid) REFERENCES neot_lessons(uuid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS neot_sync_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instance_id TEXT NOT NULL,
  cloud_url TEXT NOT NULL DEFAULT 'https://neot.in',
  role TEXT NOT NULL DEFAULT 'local',
  status TEXT NOT NULL DEFAULT 'ready',
  last_pulled_at TEXT,
  last_published_at TEXT,
  last_verified_at TEXT,
  remote_revision INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);

-- NEOT LMS Migration 0002: Evidence, Attendance, and Certificates

CREATE TABLE IF NOT EXISTS neot_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  lesson_uuid TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  max_points INTEGER NOT NULL DEFAULT 100,
  sync_id TEXT NOT NULL DEFAULT '',
  sync_status TEXT NOT NULL DEFAULT 'local',
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lesson_uuid) REFERENCES neot_lessons(uuid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS neot_assignment_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  assignment_uuid TEXT NOT NULL,
  student_email TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  attachment_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'submitted',
  score INTEGER,
  feedback TEXT,
  reviewed_by TEXT,
  sync_id TEXT NOT NULL DEFAULT '',
  sync_status TEXT NOT NULL DEFAULT 'local',
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT,
  FOREIGN KEY (assignment_uuid) REFERENCES neot_assignments(uuid) ON DELETE CASCADE,
  UNIQUE(assignment_uuid, student_email)
);

CREATE TABLE IF NOT EXISTS neot_attendance_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  class_uuid TEXT NOT NULL,
  session_date TEXT NOT NULL,
  topic TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  sync_id TEXT NOT NULL DEFAULT '',
  sync_status TEXT NOT NULL DEFAULT 'local',
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (class_uuid) REFERENCES neot_classes(uuid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS neot_attendance_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  session_uuid TEXT NOT NULL,
  student_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'present',
  notes TEXT NOT NULL DEFAULT '',
  sync_id TEXT NOT NULL DEFAULT '',
  sync_status TEXT NOT NULL DEFAULT 'local',
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_uuid) REFERENCES neot_attendance_sessions(uuid) ON DELETE CASCADE,
  UNIQUE(session_uuid, student_email)
);

CREATE TABLE IF NOT EXISTS neot_certificates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  course_uuid TEXT NOT NULL,
  student_email TEXT NOT NULL,
  certificate_code TEXT NOT NULL UNIQUE,
  grade_percentage INTEGER NOT NULL DEFAULT 100,
  issued_at TEXT NOT NULL DEFAULT (datetime('now')),
  verification_hash TEXT NOT NULL,
  FOREIGN KEY (course_uuid) REFERENCES neot_courses(uuid) ON DELETE CASCADE,
  UNIQUE(course_uuid, student_email)
);

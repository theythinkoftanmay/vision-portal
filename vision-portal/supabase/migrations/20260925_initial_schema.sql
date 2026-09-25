-- Vision Portal Initial Schema
-- Created: 2026-09-25

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Students table: registered user profiles
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  college_name TEXT NOT NULL,
  course TEXT NOT NULL,
  semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 8),
  batch TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Subjects table: global/local subject catalog
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('core', 'GE', 'SEC', 'VAC')),
  college_name TEXT NOT NULL,
  course TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, college_name, course)
);

-- Community timetables: shared schedule headers
CREATE TABLE community_timetables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_name TEXT NOT NULL,
  course TEXT NOT NULL,
  semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 8),
  section_or_batch TEXT,
  created_by UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  clones_count INTEGER DEFAULT 0 CHECK (clones_count >= 0),
  upvotes_count INTEGER DEFAULT 0 CHECK (upvotes_count >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Community slots: slots belonging to shared templates
CREATE TABLE community_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timetable_id UUID NOT NULL REFERENCES community_timetables(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('core', 'GE', 'SEC', 'VAC')),
  weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (end_time > start_time)
);

-- Student slots: personal cloned recurring weekly schedule
CREATE TABLE student_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (end_time > start_time)
);

-- Schedule exceptions: date-specific schedule changes
CREATE TABLE schedule_exceptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  exception_type TEXT NOT NULL CHECK (exception_type IN ('cancelled', 'extra')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (end_time > start_time),
  UNIQUE(student_id, subject_id, date, start_time)
);

-- Attendance: daily attendance logs
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('attended', 'missed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, subject_id, date, start_time)
);

-- Assignments: assignment logs
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'submitted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_students_college_course ON students(college_name, course, semester);

CREATE INDEX idx_subjects_college_course ON subjects(college_name, course);
CREATE INDEX idx_subjects_type ON subjects(type);

CREATE INDEX idx_community_timetables_search ON community_timetables(college_name, course, semester);
CREATE INDEX idx_community_timetables_creator ON community_timetables(created_by);

CREATE INDEX idx_community_slots_timetable ON community_slots(timetable_id);

CREATE INDEX idx_student_slots_student ON student_slots(student_id);
CREATE INDEX idx_student_slots_subject ON student_slots(subject_id);
CREATE INDEX idx_student_slots_weekday ON student_slots(student_id, weekday);

CREATE INDEX idx_schedule_exceptions_student_date ON schedule_exceptions(student_id, date);

CREATE INDEX idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX idx_attendance_student_subject ON attendance(student_id, subject_id);

CREATE INDEX idx_assignments_student ON assignments(student_id);
CREATE INDEX idx_assignments_due_date ON assignments(student_id, due_date);
CREATE INDEX idx_assignments_status ON assignments(student_id, status);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Students: users can read and update their own profile
CREATE POLICY "Users can view their own student profile"
  ON students FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own student profile"
  ON students FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own student profile"
  ON students FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Subjects: publicly readable, authenticated users can insert
CREATE POLICY "Anyone can view subjects"
  ON subjects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert subjects"
  ON subjects FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Community timetables: publicly readable, creator can edit/delete
CREATE POLICY "Anyone can view community timetables"
  ON community_timetables FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create community timetables"
  ON community_timetables FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM students WHERE id = created_by)
  );

CREATE POLICY "Creators can update their community timetables"
  ON community_timetables FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM students WHERE id = created_by)
  )
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM students WHERE id = created_by)
  );

CREATE POLICY "Creators can delete their community timetables"
  ON community_timetables FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM students WHERE id = created_by)
  );

-- Community slots: publicly readable, editable by timetable creator
CREATE POLICY "Anyone can view community slots"
  ON community_slots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Timetable creators can insert community slots"
  ON community_slots FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT s.user_id
      FROM students s
      JOIN community_timetables ct ON ct.created_by = s.id
      WHERE ct.id = timetable_id
    )
  );

CREATE POLICY "Timetable creators can update community slots"
  ON community_slots FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT s.user_id
      FROM students s
      JOIN community_timetables ct ON ct.created_by = s.id
      WHERE ct.id = timetable_id
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT s.user_id
      FROM students s
      JOIN community_timetables ct ON ct.created_by = s.id
      WHERE ct.id = timetable_id
    )
  );

CREATE POLICY "Timetable creators can delete community slots"
  ON community_slots FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT s.user_id
      FROM students s
      JOIN community_timetables ct ON ct.created_by = s.id
      WHERE ct.id = timetable_id
    )
  );

-- Student slots: private per student
CREATE POLICY "Students can view their own slots"
  ON student_slots FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM students WHERE id = student_id)
  );

CREATE POLICY "Students can insert their own slots"
  ON student_slots FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM students WHERE id = student_id)
  );

CREATE POLICY "Students can update their own slots"
  ON student_slots FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM students WHERE id = student_id)
  )
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM students WHERE id = student_id)
  );

CREATE POLICY "Students can delete their own slots"
  ON student_slots FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM students WHERE id = student_id)
  );

-- Schedule exceptions: private per student
CREATE POLICY "Students can view their own exceptions"
  ON schedule_exceptions FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM students WHERE id = student_id)
  );

CREATE POLICY "Students can insert their own exceptions"
  ON schedule_exceptions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM students WHERE id = student_id)
  );

CREATE POLICY "Students can update their own exceptions"
  ON schedule_exceptions FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM students WHERE id = student_id)
  )
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM students WHERE id = student_id)
  );

CREATE POLICY "Students can delete their own exceptions"
  ON schedule_exceptions FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM students WHERE id = student_id)
  );

-- Attendance: private per student
CREATE POLICY "Students can view their own attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM students WHERE id = student_id)
  );

CREATE POLICY "Students can insert their own attendance"
  ON attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM students WHERE id = student_id)
  );

CREATE POLICY "Students can update their own attendance"
  ON attendance FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM students WHERE id = student_id)
  )
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM students WHERE id = student_id)
  );

CREATE POLICY "Students can delete their own attendance"
  ON attendance FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM students WHERE id = student_id)
  );

-- Assignments: private per student
CREATE POLICY "Students can view their own assignments"
  ON assignments FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM students WHERE id = student_id)
  );

CREATE POLICY "Students can insert their own assignments"
  ON assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM students WHERE id = student_id)
  );

CREATE POLICY "Students can update their own assignments"
  ON assignments FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM students WHERE id = student_id)
  )
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM students WHERE id = student_id)
  );

CREATE POLICY "Students can delete their own assignments"
  ON assignments FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM students WHERE id = student_id)
  );

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update updated_at timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_community_timetables_updated_at
  BEFORE UPDATE ON community_timetables
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_slots_updated_at
  BEFORE UPDATE ON student_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

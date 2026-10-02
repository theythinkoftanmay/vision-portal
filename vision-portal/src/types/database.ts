// Database types for Vision Portal

export type SubjectType = 'core' | 'GE' | 'SEC' | 'VAC'
export type AttendanceStatus = 'attended' | 'missed' | 'cancelled'
export type AssignmentStatus = 'pending' | 'completed' | 'submitted'
export type ExceptionType = 'cancelled' | 'extra'

export interface Student {
  id: string
  user_id: string
  name: string
  college_name: string
  course: string
  semester: number
  batch: string | null
  created_at: string
  updated_at: string
}

export interface Subject {
  id: string
  name: string
  type: SubjectType
  college_name: string
  course: string
  created_at: string
}

export interface CommunityTimetable {
  id: string
  college_name: string
  course: string
  semester: number
  section_or_batch: string | null
  created_by: string
  clones_count: number
  upvotes_count: number
  created_at: string
  updated_at: string
}

export interface CommunitySlot {
  id: string
  timetable_id: string
  subject_name: string
  subject_type: SubjectType
  weekday: number // 0-6 (Sunday-Saturday)
  start_time: string // HH:MM:SS
  end_time: string // HH:MM:SS
  created_at: string
}

export interface StudentSlot {
  id: string
  student_id: string
  subject_id: string
  weekday: number
  start_time: string
  end_time: string
  created_at: string
  updated_at: string
}

export interface ScheduleException {
  id: string
  student_id: string
  subject_id: string
  date: string
  exception_type: ExceptionType
  start_time: string
  end_time: string
  created_at: string
}

export interface Attendance {
  id: string
  student_id: string
  subject_id: string
  date: string
  start_time: string
  status: AttendanceStatus
  created_at: string
  updated_at: string
}

export interface Assignment {
  id: string
  student_id: string
  subject_id: string
  title: string
  due_date: string
  status: AssignmentStatus
  created_at: string
  updated_at: string
}

// Extended types with relations
export interface CommunityTimetableWithCreator extends CommunityTimetable {
  creator?: Student
}

export interface CommunityTimetableWithSlots extends CommunityTimetable {
  community_slots: CommunitySlot[]
  creator?: Student
}

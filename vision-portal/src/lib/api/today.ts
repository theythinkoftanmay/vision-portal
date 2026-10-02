import { supabase } from '../supabase'
import type { AttendanceStatus } from '../../types/database'

export interface TodayClass {
  slot_id: string
  subject_id: string
  subject_name: string
  subject_type: string
  start_time: string
  end_time: string
  attendance_id?: string
  status?: AttendanceStatus
  is_exception?: boolean
  exception_type?: 'cancelled' | 'extra'
}

/**
 * Get today's classes for a student, merging student_slots with schedule_exceptions
 * and current attendance status
 */
export async function getTodaySchedule(studentId: string): Promise<TodayClass[]> {
  const today = new Date()
  const weekday = today.getDay() // 0 = Sunday, 6 = Saturday
  const dateStr = today.toISOString().split('T')[0] // YYYY-MM-DD

  // 1. Get regular recurring slots for today's weekday
  const { data: slots, error: slotsError } = await supabase
    .from('student_slots')
    .select(`
      id,
      subject_id,
      weekday,
      start_time,
      end_time,
      subjects (
        id,
        name,
        type
      )
    `)
    .eq('student_id', studentId)
    .eq('weekday', weekday)

  if (slotsError) throw slotsError

  // 2. Get schedule exceptions for today's date
  const { data: exceptions, error: exceptionsError } = await supabase
    .from('schedule_exceptions')
    .select(`
      id,
      subject_id,
      exception_type,
      start_time,
      end_time,
      subjects (
        id,
        name,
        type
      )
    `)
    .eq('student_id', studentId)
    .eq('date', dateStr)

  if (exceptionsError) throw exceptionsError

  // 3. Get today's attendance records
  const { data: attendanceRecords, error: attendanceError } = await supabase
    .from('attendance')
    .select('id, subject_id, start_time, status')
    .eq('student_id', studentId)
    .eq('date', dateStr)

  if (attendanceError) throw attendanceError

  // Build attendance lookup map
  const attendanceMap = new Map<string, { id: string; status: AttendanceStatus }>()
  attendanceRecords?.forEach((record) => {
    const key = `${record.subject_id}_${record.start_time}`
    attendanceMap.set(key, { id: record.id, status: record.status as AttendanceStatus })
  })

  // Build exception lookup maps
  const cancelledSlots = new Set<string>()
  const extraClasses: TodayClass[] = []

  exceptions?.forEach((exception) => {
    const subject = exception.subjects as any

    if (exception.exception_type === 'cancelled') {
      // Mark regular slots that are cancelled today
      const key = `${exception.subject_id}_${exception.start_time}`
      cancelledSlots.add(key)
    } else if (exception.exception_type === 'extra') {
      // Add extra/makeup classes
      const lookupKey = `${exception.subject_id}_${exception.start_time}`
      const attendance = attendanceMap.get(lookupKey)

      extraClasses.push({
        slot_id: exception.id,
        subject_id: exception.subject_id,
        subject_name: subject.name,
        subject_type: subject.type,
        start_time: exception.start_time,
        end_time: exception.end_time,
        is_exception: true,
        exception_type: 'extra',
        attendance_id: attendance?.id,
        status: attendance?.status,
      })
    }
  })

  // 4. Build final class list
  const classes: TodayClass[] = []

  // Add regular slots (excluding cancelled ones)
  slots?.forEach((slot) => {
    const subject = slot.subjects as any
    const lookupKey = `${slot.subject_id}_${slot.start_time}`

    // Skip if cancelled today
    if (cancelledSlots.has(lookupKey)) {
      return
    }

    const attendance = attendanceMap.get(lookupKey)

    classes.push({
      slot_id: slot.id,
      subject_id: slot.subject_id,
      subject_name: subject.name,
      subject_type: subject.type,
      start_time: slot.start_time,
      end_time: slot.end_time,
      attendance_id: attendance?.id,
      status: attendance?.status,
    })
  })

  // Add extra classes
  classes.push(...extraClasses)

  // Sort by start time
  classes.sort((a, b) => a.start_time.localeCompare(b.start_time))

  return classes
}

/**
 * Mark attendance for a specific class
 */
export async function markAttendance(
  studentId: string,
  subjectId: string,
  date: string, // YYYY-MM-DD
  startTime: string, // HH:MM:SS
  status: AttendanceStatus
): Promise<{ success: boolean; attendance_id: string }> {
  // Upsert: update if exists, insert if not
  const { data, error } = await supabase
    .from('attendance')
    .upsert(
      {
        student_id: studentId,
        subject_id: subjectId,
        date,
        start_time: startTime,
        status,
      },
      {
        onConflict: 'student_id,subject_id,date,start_time',
      }
    )
    .select('id')
    .single()

  if (error) throw error

  return { success: true, attendance_id: data.id }
}

/**
 * Mark all today's classes as attended
 */
export async function markAllAttended(
  studentId: string,
  classes: TodayClass[]
): Promise<{ success: boolean; updated: number }> {
  const today = new Date().toISOString().split('T')[0]

  const attendanceRecords = classes.map((cls) => ({
    student_id: studentId,
    subject_id: cls.subject_id,
    date: today,
    start_time: cls.start_time,
    status: 'attended' as AttendanceStatus,
  }))

  const { error } = await supabase.from('attendance').upsert(attendanceRecords, {
    onConflict: 'student_id,subject_id,date,start_time',
  })

  if (error) throw error

  return { success: true, updated: attendanceRecords.length }
}

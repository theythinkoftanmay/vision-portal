// Onboarding API functions

import { supabase } from '../supabase'
import type { SubjectType } from '../../types/database'

/**
 * Check if student has completed onboarding (has any student_slots)
 */
export async function hasCompletedOnboarding(studentId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('student_slots')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', studentId)

  if (error) {
    console.error('Error checking onboarding status:', error)
    return false
  }

  return (count ?? 0) > 0
}

/**
 * Get student's college and course info (needed for creating subjects)
 */
export async function getStudentInfo(studentId: string): Promise<{
  college_name: string
  course: string
  semester: number
}> {
  const { data, error } = await supabase
    .from('students')
    .select('college_name, course, semester')
    .eq('id', studentId)
    .single()

  if (error) {
    throw new Error(`Failed to get student info: ${error.message}`)
  }

  return data
}

/**
 * Add custom student slots (for electives, labs, etc.)
 * Follows the same pattern as cloneCommunityTimetable
 */
export async function addStudentSlots(
  studentId: string,
  slots: Array<{
    subject_name: string
    subject_type: SubjectType
    weekday: number
    start_time: string
    end_time: string
  }>
): Promise<{ slotsCreated: number }> {
  if (slots.length === 0) {
    return { slotsCreated: 0 }
  }

  // Get student's college and course info
  const studentInfo = await getStudentInfo(studentId)

  // Prepare student_slots to insert
  const studentSlotsToInsert: Array<{
    student_id: string
    subject_id: string
    weekday: number
    start_time: string
    end_time: string
  }> = []

  // For each slot, find or create the subject
  for (const slot of slots) {
    // Find existing subject
    let { data: subject, error: subjectFetchError } = await supabase
      .from('subjects')
      .select('id')
      .eq('name', slot.subject_name)
      .eq('college_name', studentInfo.college_name)
      .eq('course', studentInfo.course)
      .maybeSingle()

    if (subjectFetchError) {
      throw new Error(`Failed to fetch subject: ${subjectFetchError.message}`)
    }

    // Create subject if it doesn't exist
    if (!subject) {
      const { data: newSubject, error: createSubjectError } = await supabase
        .from('subjects')
        .insert({
          name: slot.subject_name,
          type: slot.subject_type,
          college_name: studentInfo.college_name,
          course: studentInfo.course,
        })
        .select('id')
        .single()

      if (createSubjectError) {
        throw new Error(`Failed to create subject: ${createSubjectError.message}`)
      }

      subject = newSubject
    }

    studentSlotsToInsert.push({
      student_id: studentId,
      subject_id: subject.id,
      weekday: slot.weekday,
      start_time: slot.start_time,
      end_time: slot.end_time,
    })
  }

  // Bulk insert all student slots
  const { error: insertError } = await supabase
    .from('student_slots')
    .insert(studentSlotsToInsert)

  if (insertError) {
    throw new Error(`Failed to create student slots: ${insertError.message}`)
  }

  return { slotsCreated: studentSlotsToInsert.length }
}

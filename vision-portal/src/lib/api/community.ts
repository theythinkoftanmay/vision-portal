// Community Hub API functions

import { supabase } from '../supabase'
import type { CommunitySlot, CommunityTimetableWithSlots } from '../../types/database'

export interface SearchCommunityTimetablesParams {
  college_name?: string
  course?: string
  semester?: number
}

export interface CreateCommunityTimetableInput {
  college_name: string
  course: string
  semester: number
  section_or_batch?: string
  slots: {
    subject_name: string
    subject_type: 'core' | 'GE' | 'SEC' | 'VAC'
    weekday: number
    start_time: string
    end_time: string
  }[]
}

/**
 * Search community timetables by college, course, and/or semester
 */
export async function searchCommunityTimetables(
  params: SearchCommunityTimetablesParams
): Promise<CommunityTimetableWithSlots[]> {
  let query = supabase
    .from('community_timetables')
    .select(`
      *,
      community_slots(*),
      creator:students!community_timetables_created_by_fkey(id, name)
    `)
    .order('clones_count', { ascending: false })

  if (params.college_name) {
    query = query.ilike('college_name', `%${params.college_name}%`)
  }
  if (params.course) {
    query = query.ilike('course', `%${params.course}%`)
  }
  if (params.semester) {
    query = query.eq('semester', params.semester)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to search community timetables: ${error.message}`)
  }

  return data as CommunityTimetableWithSlots[]
}

/**
 * Get a single community timetable with its slots
 */
export async function getCommunityTimetable(id: string): Promise<CommunityTimetableWithSlots> {
  const { data, error } = await supabase
    .from('community_timetables')
    .select(`
      *,
      community_slots(*),
      creator:students!community_timetables_created_by_fkey(id, name)
    `)
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(`Failed to get community timetable: ${error.message}`)
  }

  return data as CommunityTimetableWithSlots
}

/**
 * Create a new community timetable with slots
 */
export async function createCommunityTimetable(
  input: CreateCommunityTimetableInput,
  studentId: string
): Promise<CommunityTimetableWithSlots> {
  // 1. Create the timetable header
  const { data: timetable, error: timetableError } = await supabase
    .from('community_timetables')
    .insert({
      college_name: input.college_name,
      course: input.course,
      semester: input.semester,
      section_or_batch: input.section_or_batch || null,
      created_by: studentId,
      clones_count: 0,
      upvotes_count: 0,
    })
    .select()
    .single()

  if (timetableError) {
    throw new Error(`Failed to create community timetable: ${timetableError.message}`)
  }

  // 2. Create the slots
  const slotsToInsert = input.slots.map((slot) => ({
    timetable_id: timetable.id,
    subject_name: slot.subject_name,
    subject_type: slot.subject_type,
    weekday: slot.weekday,
    start_time: slot.start_time,
    end_time: slot.end_time,
  }))

  const { data: slots, error: slotsError } = await supabase
    .from('community_slots')
    .insert(slotsToInsert)
    .select()

  if (slotsError) {
    // Rollback: delete the timetable if slots creation fails
    await supabase.from('community_timetables').delete().eq('id', timetable.id)
    throw new Error(`Failed to create community slots: ${slotsError.message}`)
  }

  return {
    ...timetable,
    community_slots: slots,
  } as CommunityTimetableWithSlots
}

/**
 * Clone a community timetable to a student's personal schedule
 * This performs a deep copy - no live link to the original
 */
export async function cloneCommunityTimetable(
  timetableId: string,
  studentId: string
): Promise<{ slotsCreated: number }> {
  // 1. Get the community timetable with its slots
  const { data: timetable, error: fetchError } = await supabase
    .from('community_timetables')
    .select('*, community_slots(*)')
    .eq('id', timetableId)
    .single()

  if (fetchError) {
    throw new Error(`Failed to fetch community timetable: ${fetchError.message}`)
  }

  const communitySlots = timetable.community_slots as CommunitySlot[]

  if (!communitySlots || communitySlots.length === 0) {
    throw new Error('Community timetable has no slots to clone')
  }

  // 2. For each community slot, find or create the subject, then create student_slot
  const studentSlotsToInsert: Array<{
    student_id: string
    subject_id: string
    weekday: number
    start_time: string
    end_time: string
  }> = []

  for (const communitySlot of communitySlots) {
    // Find or create subject
    let { data: subject, error: subjectFetchError } = await supabase
      .from('subjects')
      .select('id')
      .eq('name', communitySlot.subject_name)
      .eq('college_name', timetable.college_name)
      .eq('course', timetable.course)
      .maybeSingle()

    if (subjectFetchError) {
      throw new Error(`Failed to fetch subject: ${subjectFetchError.message}`)
    }

    // Create subject if it doesn't exist
    if (!subject) {
      const { data: newSubject, error: createSubjectError } = await supabase
        .from('subjects')
        .insert({
          name: communitySlot.subject_name,
          type: communitySlot.subject_type,
          college_name: timetable.college_name,
          course: timetable.course,
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
      weekday: communitySlot.weekday,
      start_time: communitySlot.start_time,
      end_time: communitySlot.end_time,
    })
  }

  // 3. Insert all student slots (deep copy)
  const { error: insertError } = await supabase
    .from('student_slots')
    .insert(studentSlotsToInsert)

  if (insertError) {
    throw new Error(`Failed to create student slots: ${insertError.message}`)
  }

  // 4. Increment clones_count on the community timetable
  const { error: updateError } = await supabase
    .from('community_timetables')
    .update({ clones_count: timetable.clones_count + 1 })
    .eq('id', timetableId)

  if (updateError) {
    throw new Error(`Failed to update clones count: ${updateError.message}`)
  }

  return { slotsCreated: studentSlotsToInsert.length }
}

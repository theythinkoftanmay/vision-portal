import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createCommunityTimetable } from '../lib/api/community'
import type { CreateCommunityTimetableInput } from '../lib/api/community'
import { supabase } from '../lib/supabase'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface SlotInput {
  id: string // temporary ID for React keys
  subject_name: string
  subject_type: 'core' | 'GE' | 'SEC' | 'VAC'
  weekday: number
  start_time: string
  end_time: string
}

export default function PublishSchedule() {
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    college_name: '',
    course: '',
    semester: '1',
    section_or_batch: '',
  })

  const [slots, setSlots] = useState<SlotInput[]>([])
  const [currentSlot, setCurrentSlot] = useState<Omit<SlotInput, 'id'>>(
    {
      subject_name: '',
      subject_type: 'core',
      weekday: 1, // Monday
      start_time: '09:00',
      end_time: '10:00',
    }
  )

  // Get current student
  const { data: studentData, isLoading: isLoadingStudent, error: studentError } = useQuery({
    queryKey: ['currentStudent'],
    queryFn: async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      console.log('Auth user:', user)
      console.log('Auth error:', userError)

      if (!user) {
        console.error('No authenticated user found')
        throw new Error('Not authenticated')
      }

      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .single()

      console.log('Student data:', data)
      console.log('Student error:', error)

      if (error) {
        console.error('Failed to fetch student profile:', error)
        throw error
      }

      if (!data) {
        console.error('No student profile found for user:', user.id)
        throw new Error('Student profile not found')
      }

      setCurrentStudentId(data.id)

      // Pre-fill form with student data
      setFormData(prev => ({
        ...prev,
        college_name: data.college_name,
        course: data.course,
        semester: data.semester.toString(),
      }))

      return data
    },
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (input: CreateCommunityTimetableInput) => {
      if (!currentStudentId) throw new Error('No student ID')
      return createCommunityTimetable(input, currentStudentId)
    },
    onSuccess: () => {
      alert('Timetable published successfully! It is now visible in the Community Hub.')
      // Reset form
      setSlots([])
      setFormData({
        college_name: studentData?.college_name || '',
        course: studentData?.course || '',
        semester: studentData?.semester.toString() || '1',
        section_or_batch: '',
      })
    },
    onError: (error: Error) => {
      alert(`Failed to publish: ${error.message}`)
    },
  })

  const handleAddSlot = () => {
    if (!currentSlot.subject_name.trim()) {
      alert('Please enter a subject name')
      return
    }

    if (currentSlot.start_time >= currentSlot.end_time) {
      alert('End time must be after start time')
      return
    }

    setSlots([
      ...slots,
      {
        ...currentSlot,
        id: Math.random().toString(36).substr(2, 9),
      },
    ])

    // Reset current slot but keep weekday
    const newStartTime = currentSlot.end_time
    setCurrentSlot(prev => ({
      ...prev,
      subject_name: '',
      start_time: newStartTime,
      end_time: addHour(newStartTime),
    }))
  }

  const handleRemoveSlot = (id: string) => {
    setSlots(slots.filter(slot => slot.id !== id))
  }

  const handlePublish = () => {
    if (!currentStudentId) {
      alert('Please complete your student profile first')
      return
    }

    if (!formData.college_name.trim() || !formData.course.trim()) {
      alert('Please fill in college name and course')
      return
    }

    if (slots.length === 0) {
      alert('Please add at least one class slot')
      return
    }

    const input: CreateCommunityTimetableInput = {
      college_name: formData.college_name,
      course: formData.course,
      semester: parseInt(formData.semester),
      section_or_batch: formData.section_or_batch || undefined,
      slots: slots.map(({ id, ...slot }) => ({
        ...slot,
        start_time: `${slot.start_time}:00`,
        end_time: `${slot.end_time}:00`,
      })),
    }

    createMutation.mutate(input)
  }

  // Group slots by weekday for display
  const slotsByDay = slots.reduce((acc, slot) => {
    if (!acc[slot.weekday]) acc[slot.weekday] = []
    acc[slot.weekday].push(slot)
    return acc
  }, {} as Record<number, SlotInput[]>)

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Publish New Timetable</h1>
        <p className="text-gray-600">Create a timetable template for your course that other students can clone</p>
      </div>

      {/* Loading State */}
      {isLoadingStudent && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800">Loading your student profile...</p>
        </div>
      )}

      {/* Error State */}
      {studentError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 font-semibold mb-2">Unable to load student profile</p>
          <p className="text-red-700 text-sm">
            {studentError instanceof Error ? studentError.message : 'Unknown error'}
          </p>
          <p className="text-red-600 text-sm mt-2">
            Please check the browser console (F12) for more details.
          </p>
        </div>
      )}

      {/* Student Profile Info */}
      {studentData && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800">
            ✓ Logged in as: <strong>{studentData.name}</strong>
          </p>
          <p className="text-green-700 text-sm mt-1">
            {studentData.course} • Semester {studentData.semester} • {studentData.college_name}
          </p>
        </div>
      )}

      {/* Basic Info Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Timetable Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              College Name *
            </label>
            <input
              type="text"
              value={formData.college_name}
              onChange={(e) => setFormData(prev => ({ ...prev, college_name: e.target.value }))}
              placeholder="e.g., College of Vocational Studies"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Course *
            </label>
            <input
              type="text"
              value={formData.course}
              onChange={(e) => setFormData(prev => ({ ...prev, course: e.target.value }))}
              placeholder="e.g., B.Sc Computer Science"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Semester *
            </label>
            <select
              value={formData.semester}
              onChange={(e) => setFormData(prev => ({ ...prev, semester: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                <option key={sem} value={sem}>Semester {sem}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Section/Batch (optional)
            </label>
            <input
              type="text"
              value={formData.section_or_batch}
              onChange={(e) => setFormData(prev => ({ ...prev, section_or_batch: e.target.value }))}
              placeholder="e.g., Section A or Batch 2"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Add Slot Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Add Class Slots</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject Name *
            </label>
            <input
              type="text"
              value={currentSlot.subject_name}
              onChange={(e) => setCurrentSlot(prev => ({ ...prev, subject_name: e.target.value }))}
              placeholder="e.g., Data Structures"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type *
            </label>
            <select
              value={currentSlot.subject_type}
              onChange={(e) => setCurrentSlot(prev => ({ ...prev, subject_type: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="core">Core</option>
              <option value="GE">GE (Generic Elective)</option>
              <option value="SEC">SEC (Skill Enhancement)</option>
              <option value="VAC">VAC (Value Addition)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Day *
            </label>
            <select
              value={currentSlot.weekday}
              onChange={(e) => setCurrentSlot(prev => ({ ...prev, weekday: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {WEEKDAYS.map((day, idx) => (
                <option key={idx} value={idx}>{day}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Time *
            </label>
            <input
              type="time"
              value={currentSlot.start_time}
              onChange={(e) => setCurrentSlot(prev => ({ ...prev, start_time: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Time *
            </label>
            <input
              type="time"
              value={currentSlot.end_time}
              onChange={(e) => setCurrentSlot(prev => ({ ...prev, end_time: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddSlot}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-medium"
        >
          + Add Slot
        </button>
      </div>

      {/* Preview Slots */}
      {slots.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Schedule Preview ({slots.length} classes)</h2>

          <div className="space-y-4">
            {Object.entries(slotsByDay).sort(([a], [b]) => Number(a) - Number(b)).map(([weekday, daySlots]) => (
              <div key={weekday}>
                <h3 className="font-semibold text-gray-900 mb-2">{WEEKDAYS[Number(weekday)]}</h3>
                <div className="space-y-2">
                  {daySlots.sort((a, b) => a.start_time.localeCompare(b.start_time)).map((slot) => (
                    <div key={slot.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-600 w-32 text-sm">
                          {slot.start_time} - {slot.end_time}
                        </span>
                        <span className="font-medium text-gray-900">{slot.subject_name}</span>
                        <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded">
                          {slot.subject_type}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveSlot(slot.id)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Publish Button */}
      <button
        onClick={handlePublish}
        disabled={createMutation.isPending || slots.length === 0}
        className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 font-medium text-lg"
      >
        {createMutation.isPending ? 'Publishing...' : 'Publish to Community Hub'}
      </button>
    </div>
  )
}

// Helper to add an hour to a time string
function addHour(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number)
  const newHours = (hours + 1) % 24
  return `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

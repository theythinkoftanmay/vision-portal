import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { searchCommunityTimetables, cloneCommunityTimetable } from '../lib/api/community'
import type { CommunityTimetableWithSlots } from '../types/database'
import { supabase } from '../lib/supabase'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function CommunityHub() {
  const [searchParams, setSearchParams] = useState({
    college_name: '',
    course: '',
    semester: '',
  })
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  // Get current student
  useQuery({
    queryKey: ['currentStudent'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      setCurrentStudentId(data.id)
      return data
    },
  })

  // Search community timetables
  const { data: timetables, isLoading, refetch } = useQuery({
    queryKey: ['communityTimetables', searchParams],
    queryFn: () => searchCommunityTimetables({
      college_name: searchParams.college_name || undefined,
      course: searchParams.course || undefined,
      semester: searchParams.semester ? parseInt(searchParams.semester) : undefined,
    }),
    enabled: false, // Only run on manual search
  })

  // Clone mutation
  const cloneMutation = useMutation({
    mutationFn: ({ timetableId, studentId }: { timetableId: string; studentId: string }) =>
      cloneCommunityTimetable(timetableId, studentId),
    onSuccess: (result) => {
      alert(`Successfully cloned! ${result.slotsCreated} classes added to your schedule.`)
      queryClient.invalidateQueries({ queryKey: ['communityTimetables'] })
    },
    onError: (error: Error) => {
      alert(`Failed to clone: ${error.message}`)
    },
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    refetch()
  }

  const handleClone = (timetableId: string) => {
    if (!currentStudentId) {
      alert('Please complete your student profile first')
      return
    }
    if (confirm('Clone this timetable to your personal schedule?')) {
      cloneMutation.mutate({ timetableId, studentId: currentStudentId })
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Community Timetable Hub</h1>
        <p className="text-gray-600">Search and clone timetables created by other students</p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              College Name
            </label>
            <input
              type="text"
              value={searchParams.college_name}
              onChange={(e) => setSearchParams(prev => ({ ...prev, college_name: e.target.value }))}
              placeholder="e.g., College of Vocational Studies"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Course
            </label>
            <input
              type="text"
              value={searchParams.course}
              onChange={(e) => setSearchParams(prev => ({ ...prev, course: e.target.value }))}
              placeholder="e.g., B.Sc Computer Science"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Semester
            </label>
            <select
              value={searchParams.semester}
              onChange={(e) => setSearchParams(prev => ({ ...prev, semester: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                <option key={sem} value={sem}>Semester {sem}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-medium"
        >
          {isLoading ? 'Searching...' : 'Search Timetables'}
        </button>
      </form>

      {/* Results */}
      {timetables && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              {timetables.length} {timetables.length === 1 ? 'Result' : 'Results'}
            </h2>
          </div>

          {timetables.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600">No timetables found. Try different search criteria or create one!</p>
            </div>
          ) : (
            timetables.map((timetable) => (
              <TimetableCard
                key={timetable.id}
                timetable={timetable}
                onClone={handleClone}
                isCloning={cloneMutation.isPending}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

interface TimetableCardProps {
  timetable: CommunityTimetableWithSlots
  onClone: (id: string) => void
  isCloning: boolean
}

function TimetableCard({ timetable, onClone, isCloning }: TimetableCardProps) {
  const [expanded, setExpanded] = useState(false)

  const slotsByDay = timetable.community_slots.reduce((acc, slot) => {
    if (!acc[slot.weekday]) acc[slot.weekday] = []
    acc[slot.weekday].push(slot)
    return acc
  }, {} as Record<number, typeof timetable.community_slots>)

  // Sort slots by start time within each day
  Object.values(slotsByDay).forEach(daySlots => {
    daySlots.sort((a, b) => a.start_time.localeCompare(b.start_time))
  })

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {timetable.course} - Semester {timetable.semester}
            </h3>
            <p className="text-gray-600 mb-1">{timetable.college_name}</p>
            {timetable.section_or_batch && (
              <p className="text-sm text-gray-500">Section/Batch: {timetable.section_or_batch}</p>
            )}
          </div>
          <button
            onClick={() => onClone(timetable.id)}
            disabled={isCloning}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 font-medium"
          >
            Clone
          </button>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
          <span>👤 Created by {timetable.creator?.name || 'Unknown'}</span>
          <span>📋 Cloned by {timetable.clones_count} students</span>
          <span>⬆️ {timetable.upvotes_count} upvotes</span>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-blue-600 hover:text-blue-700 font-medium text-sm"
        >
          {expanded ? '▼ Hide Schedule' : '▶ View Schedule'} ({timetable.community_slots.length} classes)
        </button>

        {expanded && (
          <div className="mt-4 border-t pt-4">
            <div className="space-y-3">
              {Object.entries(slotsByDay).sort(([a], [b]) => Number(a) - Number(b)).map(([weekday, slots]) => (
                <div key={weekday}>
                  <h4 className="font-semibold text-gray-900 mb-2">{WEEKDAYS[Number(weekday)]}</h4>
                  <div className="space-y-1">
                    {slots.map((slot) => (
                      <div key={slot.id} className="flex items-center gap-3 text-sm pl-4">
                        <span className="text-gray-600 w-32">
                          {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                        </span>
                        <span className="font-medium text-gray-900">{slot.subject_name}</span>
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                          {slot.subject_type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

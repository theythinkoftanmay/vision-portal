import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { searchCommunityTimetables } from '../../lib/api/community'
import type { CommunityTimetableWithSlots } from '../../types/database'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface Step2SearchProps {
  profileData: {
    college_name: string
    course: string
    semester: number
  }
  onSelect: (timetableId: string) => void
  onSkip: () => void
  onBack: () => void
}

export default function Step2Search({ profileData, onSelect, onSkip, onBack }: Step2SearchProps) {
  const [searchParams, setSearchParams] = useState({
    college_name: profileData.college_name,
    course: profileData.course,
    semester: profileData.semester.toString(),
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Search community timetables
  const { data: timetables, isLoading, refetch } = useQuery({
    queryKey: ['onboarding-search', searchParams],
    queryFn: () => searchCommunityTimetables({
      college_name: searchParams.college_name || undefined,
      course: searchParams.course || undefined,
      semester: searchParams.semester ? parseInt(searchParams.semester) : undefined,
    }),
    enabled: false, // Only run on manual search
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    refetch()
  }

  const handleSelectAndNext = () => {
    if (selectedId) {
      onSelect(selectedId)
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Find a Timetable Template</h2>
        <p className="text-gray-600 mb-6">
          Search for timetables shared by students in your college and course, or skip to create your own.
        </p>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </div>

      {/* Search Results */}
      {timetables && (
        <div className="space-y-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            {timetables.length} {timetables.length === 1 ? 'Result' : 'Results'}
          </h3>

          {timetables.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600 mb-4">
                No timetables found. You can skip this step and create your own schedule from scratch.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {timetables.map((timetable) => (
                <TimetableCard
                  key={timetable.id}
                  timetable={timetable}
                  selected={selectedId === timetable.id}
                  onSelect={() => setSelectedId(timetable.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
        >
          ← Back
        </button>

        <button
          onClick={onSkip}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
        >
          Skip to Create Own
        </button>

        {selectedId && (
          <button
            onClick={handleSelectAndNext}
            className="flex-1 bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 font-medium"
          >
            Next: Clone This Template →
          </button>
        )}
      </div>
    </div>
  )
}

// Timetable Card Component
function TimetableCard({
  timetable,
  selected,
  onSelect,
}: {
  timetable: CommunityTimetableWithSlots
  selected: boolean
  onSelect: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  // Group slots by weekday
  const slotsByDay = timetable.community_slots.reduce((acc, slot) => {
    if (!acc[slot.weekday]) acc[slot.weekday] = []
    acc[slot.weekday].push(slot)
    return acc
  }, {} as Record<number, typeof timetable.community_slots>)

  // Sort days and slots
  const sortedDays = Object.keys(slotsByDay)
    .map(Number)
    .sort((a, b) => a - b)

  return (
    <div
      className={`bg-white rounded-lg shadow p-6 cursor-pointer border-2 transition-colors ${
        selected ? 'border-green-500 bg-green-50' : 'border-transparent hover:border-blue-300'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            {timetable.course} • Semester {timetable.semester}
          </h3>
          <p className="text-gray-600 text-sm">{timetable.college_name}</p>
          {timetable.section_or_batch && (
            <p className="text-gray-500 text-sm">{timetable.section_or_batch}</p>
          )}
        </div>
        <div className="text-right">
          <div className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            {timetable.community_slots.length} classes
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
        <span>Created by {timetable.creator?.name || 'Unknown'}</span>
        <span>•</span>
        <span>Cloned by {timetable.clones_count} students</span>
      </div>

      {selected && (
        <div className="mt-3 p-3 bg-green-100 border border-green-200 rounded-md">
          <p className="text-green-800 font-medium text-sm">✓ Selected</p>
        </div>
      )}

      {/* Expandable Schedule Preview */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          setExpanded(!expanded)
        }}
        className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
      >
        {expanded ? '▼ Hide Schedule' : '▶ View Schedule'}
      </button>

      {expanded && (
        <div className="mt-4 space-y-3 border-t pt-4">
          {sortedDays.map((dayNum) => {
            const daySlots = slotsByDay[dayNum].sort((a, b) =>
              a.start_time.localeCompare(b.start_time)
            )
            return (
              <div key={dayNum}>
                <h4 className="font-medium text-gray-900 mb-2">{WEEKDAYS[dayNum]}</h4>
                <div className="space-y-1 ml-4">
                  {daySlots.map((slot) => (
                    <div key={slot.id} className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">
                        {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                      </span>
                      <span className="font-medium">{slot.subject_name}</span>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                        {slot.subject_type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

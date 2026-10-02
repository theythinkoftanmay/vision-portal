import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getTodaySchedule, markAttendance, markAllAttended } from '../lib/api/today'
import type { TodayClass } from '../lib/api/today'
import type { AttendanceStatus } from '../types/database'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function TodayView() {
  const [studentId, setStudentId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  // Get current student
  useEffect(() => {
    const fetchStudent = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (student) {
        setStudentId(student.id)
      }
    }

    fetchStudent()
  }, [])

  // Get today's schedule
  const { data: classes, isLoading, error } = useQuery({
    queryKey: ['today-schedule', studentId],
    queryFn: () => getTodaySchedule(studentId!),
    enabled: !!studentId,
  })

  // Mark single attendance
  const markAttendanceMutation = useMutation({
    mutationFn: ({
      subjectId,
      startTime,
      status,
    }: {
      subjectId: string
      startTime: string
      status: AttendanceStatus
    }) => {
      const today = new Date().toISOString().split('T')[0]
      return markAttendance(studentId!, subjectId, today, startTime, status)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today-schedule', studentId] })
    },
    onError: (error: Error) => {
      console.error('Mark attendance error:', error)
      alert(`Failed to mark attendance: ${error.message}`)
    },
  })

  // Mark all attended
  const markAllMutation = useMutation({
    mutationFn: () => markAllAttended(studentId!, classes!),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['today-schedule', studentId] })
      alert(`✓ Marked ${result.updated} class${result.updated > 1 ? 'es' : ''} as attended`)
    },
    onError: (error: Error) => {
      console.error('Mark all attended error:', error)
      alert(`Failed to mark all: ${error.message}`)
    },
  })

  const handleMarkAttendance = (subjectId: string, startTime: string, status: AttendanceStatus) => {
    markAttendanceMutation.mutate({ subjectId, startTime, status })
  }

  const handleMarkAll = () => {
    if (!classes || classes.length === 0) {
      alert('No classes to mark today')
      return
    }

    if (confirm(`Mark all ${classes.length} classes as attended?`)) {
      markAllMutation.mutate()
    }
  }

  const today = new Date()
  const todayStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  if (!studentId) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Please complete your profile first</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading today's schedule...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error loading schedule: {(error as Error).message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Today's Schedule</h1>
        <p className="text-gray-600">{todayStr}</p>
      </div>

      {/* Quick Actions */}
      {classes && classes.length > 0 && (
        <div className="mb-6">
          <button
            onClick={handleMarkAll}
            disabled={markAllMutation.isPending}
            className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 disabled:bg-gray-400 font-medium transition-colors"
          >
            {markAllMutation.isPending ? 'Marking...' : '✓ Mark All as Attended'}
          </button>
        </div>
      )}

      {/* Classes List */}
      {!classes || classes.length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <p className="text-blue-800 text-lg font-medium mb-2">No classes today! 🎉</p>
          <p className="text-blue-600">Enjoy your day off</p>
        </div>
      ) : (
        <div className="space-y-4">
          {classes.map((cls) => (
            <ClassCard
              key={`${cls.subject_id}_${cls.start_time}`}
              class={cls}
              onMarkAttendance={handleMarkAttendance}
              isUpdating={markAttendanceMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Info Footer */}
      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-gray-600 text-sm">
          💡 <strong>Tip:</strong> Attendance is logged per class. Cancelled classes won't affect your
          attendance percentage.
        </p>
      </div>
    </div>
  )
}

interface ClassCardProps {
  class: TodayClass
  onMarkAttendance: (subjectId: string, startTime: string, status: AttendanceStatus) => void
  isUpdating: boolean
}

function ClassCard({ class: cls, onMarkAttendance, isUpdating }: ClassCardProps) {
  const statusColors = {
    attended: 'bg-green-100 text-green-800 border-green-300',
    missed: 'bg-red-100 text-red-800 border-red-300',
    cancelled: 'bg-gray-100 text-gray-800 border-gray-300',
  }

  const statusIcons = {
    attended: '✓',
    missed: '✗',
    cancelled: '⊘',
  }

  const currentStatusColor = cls.status ? statusColors[cls.status] : 'border-gray-200'

  return (
    <div
      className={`bg-white rounded-lg shadow border-2 p-6 transition-all ${currentStatusColor}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-semibold text-gray-900">{cls.subject_name}</h3>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
              {cls.subject_type}
            </span>
            {cls.is_exception && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                {cls.exception_type === 'extra' ? '+ Extra Class' : 'Cancelled'}
              </span>
            )}
          </div>
          <p className="text-gray-600">
            {cls.start_time.slice(0, 5)} - {cls.end_time.slice(0, 5)}
          </p>
        </div>

        {cls.status && (
          <div className="text-right">
            <div className={`px-3 py-1 rounded-full font-medium text-sm ${statusColors[cls.status]}`}>
              {statusIcons[cls.status]} {cls.status.charAt(0).toUpperCase() + cls.status.slice(1)}
            </div>
          </div>
        )}
      </div>

      {/* Status Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onMarkAttendance(cls.subject_id, cls.start_time, 'attended')}
          disabled={isUpdating || cls.status === 'attended'}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            cls.status === 'attended'
              ? 'bg-green-600 text-white'
              : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-300'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {cls.status === 'attended' ? '✓ ' : ''}Attended
        </button>

        <button
          onClick={() => onMarkAttendance(cls.subject_id, cls.start_time, 'missed')}
          disabled={isUpdating || cls.status === 'missed'}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            cls.status === 'missed'
              ? 'bg-red-600 text-white'
              : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-300'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {cls.status === 'missed' ? '✗ ' : ''}Missed
        </button>

        <button
          onClick={() => onMarkAttendance(cls.subject_id, cls.start_time, 'cancelled')}
          disabled={isUpdating || cls.status === 'cancelled'}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            cls.status === 'cancelled'
              ? 'bg-gray-600 text-white'
              : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-300'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {cls.status === 'cancelled' ? '⊘ ' : ''}Cancelled
        </button>
      </div>
    </div>
  )
}

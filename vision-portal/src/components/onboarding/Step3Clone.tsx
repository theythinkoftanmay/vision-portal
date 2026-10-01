import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { cloneCommunityTimetable } from '../../lib/api/community'

interface Step3CloneProps {
  studentId: string
  timetableId: string
  onSuccess: (slotsCreated: number) => void
  onBack: () => void
}

export default function Step3Clone({ studentId, timetableId, onSuccess, onBack }: Step3CloneProps) {
  const [cloned, setCloned] = useState(false)
  const [slotsCreated, setSlotsCreated] = useState(0)

  const cloneMutation = useMutation({
    mutationFn: () => cloneCommunityTimetable(timetableId, studentId),
    onSuccess: (result) => {
      setSlotsCreated(result.slotsCreated)
      setCloned(true)
    },
    onError: (error: Error) => {
      alert(`Failed to clone: ${error.message}`)
    },
  })

  const handleClone = () => {
    if (confirm('Clone this timetable to your schedule? This will add all classes to your personal timetable.')) {
      cloneMutation.mutate()
    }
  }

  const handleNext = () => {
    onSuccess(slotsCreated)
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Clone Timetable</h2>
        <p className="text-gray-600 mb-6">
          Copy this timetable to your personal schedule. You'll be able to add your electives in the next step.
        </p>

        {!cloned ? (
          <div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">What happens when you clone?</h3>
              <ul className="space-y-2 text-blue-800 text-sm">
                <li>✓ All core subjects from this template will be added to your schedule</li>
                <li>✓ This is a complete copy - changes to the original won't affect your schedule</li>
                <li>✓ You can customize it with your electives and lab batches in the next step</li>
              </ul>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleClone}
                disabled={cloneMutation.isPending}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 font-medium text-lg transition-colors"
              >
                {cloneMutation.isPending ? 'Cloning...' : 'Clone This Timetable'}
              </button>

              <button
                onClick={onBack}
                disabled={cloneMutation.isPending}
                className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
              >
                ← Back to Search
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-green-900 text-lg">Successfully Cloned!</h3>
                  <p className="text-green-700">{slotsCreated} classes added to your schedule</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 text-sm">
                💡 <strong>Next step:</strong> Add your specific electives (SEC/VAC/GE) and lab/tutorial batches to complete your timetable.
              </p>
            </div>

            <button
              onClick={handleNext}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 font-medium text-lg transition-colors"
            >
              Next: Add Your Electives →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

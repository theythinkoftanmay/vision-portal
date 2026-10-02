import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { addStudentSlots } from '../../lib/api/onboarding'
import type { SubjectType } from '../../types/database'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface SlotInput {
  id: string // temporary ID for React keys
  subject_name: string
  subject_type: SubjectType
  weekday: number
  start_time: string
  end_time: string
}

interface Step4ElectivesProps {
  studentId: string
  hasClonedSlots: boolean
  onFinish: () => void
  onBack: () => void
}

export default function Step4Electives({ studentId, hasClonedSlots, onFinish, onBack }: Step4ElectivesProps) {
  const [slots, setSlots] = useState<SlotInput[]>([])
  const [currentSlot, setCurrentSlot] = useState<Omit<SlotInput, 'id'>>({
    subject_name: '',
    subject_type: 'SEC',
    weekday: 1, // Monday
    start_time: '09:00',
    end_time: '10:00',
  })

  const [isProcessing, setIsProcessing] = useState(false)

  const addSlotsMutation = useMutation({
    mutationFn: () => {
      const slotsToAdd = slots.map(slot => ({
        subject_name: slot.subject_name,
        subject_type: slot.subject_type,
        weekday: slot.weekday,
        start_time: slot.start_time,
        end_time: slot.end_time,
      }))
      return addStudentSlots(studentId, slotsToAdd)
    },
    onSuccess: (result) => {
      if (result.slotsCreated > 0) {
        alert(`Success! ${result.slotsCreated} elective(s) added to your schedule.`)
      }
      setIsProcessing(false)
      onFinish()
    },
    onError: (error: Error) => {
      console.error('Add slots mutation error:', error)
      alert(`Failed to add electives: ${error.message}. Try again or finish without adding more classes.`)
      setIsProcessing(false)
    },
  })

  const handleAddSlot = () => {
    // Validation
    if (!currentSlot.subject_name.trim()) {
      alert('Please enter a subject name')
      return
    }

    if (currentSlot.end_time <= currentSlot.start_time) {
      alert('End time must be after start time')
      return
    }

    // Add slot to list
    const newSlot: SlotInput = {
      id: `temp-${Date.now()}`,
      ...currentSlot,
      subject_name: currentSlot.subject_name.trim(),
    }

    setSlots(prev => [...prev, newSlot])

    // Reset form
    setCurrentSlot({
      subject_name: '',
      subject_type: 'SEC',
      weekday: currentSlot.weekday,
      start_time: '09:00',
      end_time: '10:00',
    })
  }

  const handleRemoveSlot = (id: string) => {
    setSlots(prev => prev.filter(slot => slot.id !== id))
  }

  const handleFinish = () => {
    if (slots.length === 0) {
      // Allow finishing without adding electives
      if (hasClonedSlots) {
        if (confirm('Skip adding electives and finish setup?')) {
          onFinish()
        }
      } else {
        alert('Please add at least one class to your schedule')
      }
    } else {
      setIsProcessing(true)
      addSlotsMutation.mutate()
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Add Your Electives & Labs</h2>
        <p className="text-gray-600 mb-6">
          {hasClonedSlots
            ? 'Add your specific electives (SEC/VAC/GE) and lab/tutorial batches on top of your cloned timetable.'
            : 'Add your classes to create your timetable from scratch.'}
        </p>

        {/* Add Slot Form */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Add a Class</h3>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject Name *
                </label>
                <input
                  type="text"
                  value={currentSlot.subject_name}
                  onChange={(e) => setCurrentSlot(prev => ({ ...prev, subject_name: e.target.value }))}
                  placeholder="e.g., Machine Learning Lab"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject Type *
                </label>
                <select
                  value={currentSlot.subject_type}
                  onChange={(e) => setCurrentSlot(prev => ({ ...prev, subject_type: e.target.value as SubjectType }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="core">Core</option>
                  <option value="GE">GE (Generic Elective)</option>
                  <option value="SEC">SEC (Skill Enhancement)</option>
                  <option value="VAC">VAC (Value Addition)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Day *
                </label>
                <select
                  value={currentSlot.weekday}
                  onChange={(e) => setCurrentSlot(prev => ({ ...prev, weekday: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {WEEKDAYS.map((day, index) => (
                    <option key={index} value={index}>{day}</option>
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
              onClick={handleAddSlot}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-medium"
            >
              + Add Class
            </button>
          </div>
        </div>

        {/* Added Slots List */}
        {slots.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Added Classes ({slots.length})</h3>
            <div className="space-y-2">
              {slots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{slot.subject_name}</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                        {slot.subject_type}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {WEEKDAYS[slot.weekday]} • {slot.start_time} - {slot.end_time}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveSlot(slot.id)}
                    className="text-red-600 hover:text-red-700 font-medium text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Box */}
        {hasClonedSlots && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800 text-sm">
              💡 These classes will be added to your existing schedule. You can skip this step if you don't have any additional electives or labs to add.
            </p>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-4">
        <button
          onClick={onBack}
          disabled={isProcessing || addSlotsMutation.isPending}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          ← Back
        </button>

        <button
          onClick={handleFinish}
          disabled={isProcessing || addSlotsMutation.isPending}
          className="flex-1 bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 font-medium text-lg"
        >
          {isProcessing || addSlotsMutation.isPending
            ? 'Saving...'
            : slots.length > 0
            ? `Finish Setup & Add ${slots.length} Class${slots.length > 1 ? 'es' : ''}`
            : hasClonedSlots
            ? 'Skip & Finish Setup'
            : 'Add at least one class'}
        </button>
      </div>
    </div>
  )
}

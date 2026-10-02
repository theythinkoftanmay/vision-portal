import { useState } from 'react'
import { supabase } from '../../lib/supabase'

interface Step1ProfileProps {
  onNext: (data: {
    studentId: string
    name: string
    college_name: string
    course: string
    semester: number
    batch: string
  }) => void
  initialData?: {
    name: string
    college_name: string
    course: string
    semester: number
    batch: string
  }
}

export default function Step1Profile({ onNext, initialData }: Step1ProfileProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    college_name: initialData?.college_name || '',
    course: initialData?.course || '',
    semester: initialData?.semester || 1,
    batch: initialData?.batch || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('Not authenticated. Please sign in again.')
      }

      // Create student profile
      const { data, error: insertError } = await supabase
        .from('students')
        .insert({
          user_id: user.id,
          name: formData.name.trim(),
          college_name: formData.college_name.trim(),
          course: formData.course.trim(),
          semester: formData.semester,
          batch: formData.batch.trim() || null,
        })
        .select()
        .single()

      if (insertError) {
        console.error('Insert error:', insertError)
        throw insertError
      }

      if (!data) {
        throw new Error('Profile created but no data returned')
      }

      console.log('Student profile created:', data)

      // Move to next step
      onNext({
        studentId: data.id,
        name: formData.name.trim(),
        college_name: formData.college_name.trim(),
        course: formData.course.trim(),
        semester: formData.semester,
        batch: formData.batch.trim(),
      })
    } catch (err) {
      console.error('Profile creation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your Profile</h2>
        <p className="text-gray-600 mb-6">Tell us about yourself to get started</p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              placeholder="John Doe"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* College */}
          <div>
            <label htmlFor="college" className="block text-sm font-medium text-gray-700 mb-1">
              College Name *
            </label>
            <input
              id="college"
              type="text"
              value={formData.college_name}
              onChange={(e) => setFormData(prev => ({ ...prev, college_name: e.target.value }))}
              required
              placeholder="e.g., College of Vocational Studies"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Course */}
          <div>
            <label htmlFor="course" className="block text-sm font-medium text-gray-700 mb-1">
              Course *
            </label>
            <input
              id="course"
              type="text"
              value={formData.course}
              onChange={(e) => setFormData(prev => ({ ...prev, course: e.target.value }))}
              required
              placeholder="e.g., B.Sc Computer Science"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Semester and Batch */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="semester" className="block text-sm font-medium text-gray-700 mb-1">
                Current Semester *
              </label>
              <select
                id="semester"
                value={formData.semester}
                onChange={(e) => setFormData(prev => ({ ...prev, semester: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                  <option key={sem} value={sem}>Semester {sem}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="batch" className="block text-sm font-medium text-gray-700 mb-1">
                Batch (optional)
              </label>
              <input
                id="batch"
                type="text"
                value={formData.batch}
                onChange={(e) => setFormData(prev => ({ ...prev, batch: e.target.value }))}
                placeholder="e.g., Batch A or 2024"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-medium text-lg transition-colors"
          >
            {loading ? 'Creating Profile...' : 'Next: Find a Timetable'}
          </button>
        </form>
      </div>
    </div>
  )
}

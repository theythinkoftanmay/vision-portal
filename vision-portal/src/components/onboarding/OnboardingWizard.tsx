import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Step1Profile from './Step1Profile'
import Step2Search from './Step2Search'
import Step3Clone from './Step3Clone'
import Step4Electives from './Step4Electives'
import { supabase } from '../../lib/supabase'
import { hasCompletedOnboarding } from '../../lib/api/onboarding'

const STEPS = [
  { number: 1, title: 'Create Profile' },
  { number: 2, title: 'Find Template' },
  { number: 3, title: 'Clone Timetable' },
  { number: 4, title: 'Add Electives' },
]

interface ProfileData {
  name: string
  college_name: string
  course: string
  semester: number
  batch: string
}

export default function OnboardingWizard() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [selectedTimetableId, setSelectedTimetableId] = useState<string | null>(null)
  const [clonedSlotCount, setClonedSlotCount] = useState(0)

  // Check if user has already completed onboarding
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          navigate('/auth')
          return
        }

        // Check if student record exists
        const { data: student } = await supabase
          .from('students')
          .select('id, name, college_name, course, semester, batch')
          .eq('user_id', user.id)
          .maybeSingle()

        if (student) {
          // Check if already has slots (completed onboarding)
          const completed = await hasCompletedOnboarding(student.id)
          if (completed) {
            navigate('/')
            return
          }

          // Has profile but no slots - pre-fill and start from step 2
          setStudentId(student.id)
          setProfileData({
            name: student.name,
            college_name: student.college_name,
            course: student.course,
            semester: student.semester,
            batch: student.batch || '',
          })
          setCurrentStep(2)
        } else {
          // No profile - start from step 1
          setCurrentStep(1)
        }
      } catch (err) {
        console.error('Error checking onboarding status:', err)
      } finally {
        setLoading(false)
      }
    }

    checkOnboardingStatus()
  }, [navigate])

  const handleStep1Next = (data: {
    studentId: string
    name: string
    college_name: string
    course: string
    semester: number
    batch: string
  }) => {
    setStudentId(data.studentId)
    setProfileData({
      name: data.name,
      college_name: data.college_name,
      course: data.course,
      semester: data.semester,
      batch: data.batch,
    })
    setCurrentStep(2)
  }

  const handleStep2Select = (timetableId: string) => {
    setSelectedTimetableId(timetableId)
    setCurrentStep(3)
  }

  const handleStep2Skip = () => {
    setSelectedTimetableId(null)
    setCurrentStep(4)
  }

  const handleStep2Back = () => {
    setCurrentStep(1)
  }

  const handleStep3Success = (slotsCreated: number) => {
    setClonedSlotCount(slotsCreated)
    setCurrentStep(4)
  }

  const handleStep3Back = () => {
    setSelectedTimetableId(null)
    setCurrentStep(2)
  }

  const handleStep4Finish = () => {
    navigate('/')
  }

  const handleStep4Back = () => {
    if (selectedTimetableId) {
      setCurrentStep(3)
    } else {
      setCurrentStep(2)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-green-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 py-8 px-4">
      {/* Progress Indicator */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const isActive = step.number === currentStep
            const isCompleted = step.number < currentStep
            return (
              <div key={step.number} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isActive
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? '✓' : step.number}
                </div>
                <span
                  className={`ml-2 hidden sm:block font-medium ${
                    isActive ? 'text-green-700' : 'text-gray-500'
                  }`}
                >
                  {step.title}
                </span>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-12 sm:w-24 h-1 mx-2 sm:mx-4 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
        <div className="mt-2 text-center text-gray-600">
          Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].title}
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 1 && (
        <Step1Profile onNext={handleStep1Next} />
      )}

      {currentStep === 2 && profileData && (
        <Step2Search
          profileData={profileData}
          onSelect={handleStep2Select}
          onSkip={handleStep2Skip}
          onBack={handleStep2Back}
        />
      )}

      {currentStep === 3 && studentId && selectedTimetableId && (
        <Step3Clone
          studentId={studentId}
          timetableId={selectedTimetableId}
          onSuccess={handleStep3Success}
          onBack={handleStep3Back}
        />
      )}

      {currentStep === 4 && studentId && (
        <Step4Electives
          studentId={studentId}
          hasClonedSlots={clonedSlotCount > 0}
          onFinish={handleStep4Finish}
          onBack={handleStep4Back}
        />
      )}
    </div>
  )
}
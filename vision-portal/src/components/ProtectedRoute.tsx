import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireProfile?: boolean
}

export default function ProtectedRoute({ children, requireProfile = false }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [hasProfile, setHasProfile] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        setIsAuthenticated(false)
        setLoading(false)
        return
      }

      setIsAuthenticated(true)

      if (requireProfile) {
        // Check if student profile exists
        const { data: student } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (!student) {
          setHasProfile(false)
        } else {
          // Check if student has completed onboarding (has any student_slots)
          const { data: slots } = await supabase
            .from('student_slots')
            .select('id')
            .eq('student_id', student.id)
            .limit(1)
            .maybeSingle()

          setHasProfile(!!slots)
        }
      }
    } catch (err) {
      console.error('Auth check failed:', err)
      setIsAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  if (requireProfile && !hasProfile) {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}

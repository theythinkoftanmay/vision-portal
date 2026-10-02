import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useEffect, useState } from 'react'
import CommunityHub from './components/CommunityHub'
import PublishSchedule from './components/PublishSchedule'
import TodayView from './components/TodayView'
import Auth from './components/Auth'
import OnboardingWizard from './components/onboarding/OnboardingWizard'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  const [user, setUser] = useState<any>(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Test Supabase connection
    const testConnection = async () => {
      try {
        const { error } = await supabase.from('students').select('count', { count: 'exact', head: true })
        if (error && error.code !== 'PGRST116') {
          // PGRST116 means table doesn't exist yet, which is fine for now
          console.error('Supabase connection error:', error)
          setConnectionStatus('error')
        } else {
          setConnectionStatus('connected')
        }
      } catch (err) {
        console.error('Connection test failed:', err)
        setConnectionStatus('error')
      }
    }

    testConnection()

    // Check current auth state
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/auth')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* Public Routes */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/onboarding" element={
          <ProtectedRoute>
            <OnboardingWizard />
          </ProtectedRoute>
        } />

        {/* Protected Routes */}
        <Route path="/*" element={
          <ProtectedRoute requireProfile={true}>
            <MainApp
              connectionStatus={connectionStatus}
              user={user}
              onLogout={handleLogout}
            />
          </ProtectedRoute>
        } />
      </Routes>
    </div>
  )
}

function MainApp({ connectionStatus, user, onLogout }: {
  connectionStatus: 'checking' | 'connected' | 'error'
  user: any
  onLogout: () => void
}) {
  const location = useLocation()

  return (
    <>
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="text-xl font-bold text-gray-900">
              Vision Portal
            </Link>
            <div className="flex items-center gap-4">
              <NavLink to="/" active={location.pathname === '/'}>
                Today
              </NavLink>
              <NavLink to="/community" active={location.pathname === '/community'}>
                Community Hub
              </NavLink>
              <NavLink to="/publish" active={location.pathname === '/publish'}>
                Publish Schedule
              </NavLink>
              {user && (
                <button
                  onClick={onLogout}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 font-medium"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <Routes>
        <Route path="/" element={<TodayView />} />
        <Route path="/community" element={<CommunityHub />} />
        <Route path="/publish" element={<PublishSchedule />} />
        <Route path="/status" element={<Home connectionStatus={connectionStatus} />} />
      </Routes>
    </>
  )
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={`px-4 py-2 rounded-md font-medium transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {children}
    </Link>
  )
}

function Home({ connectionStatus }: { connectionStatus: 'checking' | 'connected' | 'error' }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Welcome to Vision Portal</h1>

      {/* Tailwind v4 test element */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg">
        <p className="text-white font-bold text-lg">✓ Tailwind v4 styles are working!</p>
        <p className="text-blue-100 text-sm mt-1">Gradient, colors, spacing, and shadows all rendering correctly.</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">System Status</h2>

        <div className="space-y-3">
          <StatusItem
            label="React + Vite + TypeScript"
            status="connected"
          />
          <StatusItem
            label="Tailwind CSS"
            status="connected"
          />
          <StatusItem
            label="React Router"
            status="connected"
          />
          <StatusItem
            label="TanStack Query"
            status="connected"
          />
          <StatusItem
            label="Supabase Connection"
            status={connectionStatus}
          />
        </div>

        {connectionStatus === 'error' && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-red-800 text-sm">
              Supabase connection failed. Make sure you have set up your .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
            </p>
          </div>
        )}

        {connectionStatus === 'connected' && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
            <p className="text-green-800 text-sm">
              All systems connected! Ready to build features.
            </p>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          to="/community"
          className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 border-2 border-transparent hover:border-blue-500"
        >
          <h3 className="text-xl font-semibold text-gray-900 mb-2">🔍 Community Hub</h3>
          <p className="text-gray-600">Search and clone timetables created by other students</p>
        </Link>

        <Link
          to="/publish"
          className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 border-2 border-transparent hover:border-green-500"
        >
          <h3 className="text-xl font-semibold text-gray-900 mb-2">📝 Publish Schedule</h3>
          <p className="text-gray-600">Create and share your timetable with the community</p>
        </Link>
      </div>
    </div>
  )
}

function StatusItem({ label, status }: { label: string; status: 'checking' | 'connected' | 'error' }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-gray-700">{label}</span>
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
        status === 'connected' ? 'bg-green-100 text-green-800' :
        status === 'checking' ? 'bg-yellow-100 text-yellow-800' :
        'bg-red-100 text-red-800'
      }`}>
        {status === 'checking' ? 'Checking...' : status === 'connected' ? 'Connected' : 'Error'}
      </span>
    </div>
  )
}

export default App

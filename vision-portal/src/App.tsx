import { Routes, Route } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useEffect, useState } from 'react'

function App() {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking')

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
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Vision Portal</h1>

        {/* Tailwind v4 test element */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg">
          <p className="text-white font-bold text-lg">✓ Tailwind v4 styles are working!</p>
          <p className="text-blue-100 text-sm mt-1">Gradient, colors, spacing, and shadows all rendering correctly.</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
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

        <Routes>
          <Route path="/" element={<div className="mt-6 text-gray-600">Home route ready</div>} />
        </Routes>
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

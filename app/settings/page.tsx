'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'profile' | 'preferences' | 'password' | 'danger'>('profile')
  
  // Profile states
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  
  // Preferences
  const [theme, setTheme] = useState('dark')
  const [emailNotifications, setEmailNotifications] = useState(true)
  
  // Password
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // States
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/auth/login')
          return
        }

        setUser(user)
        setEmail(user.email || '')
        setDisplayName(user.user_metadata?.display_name || user.email?.split('@')[0] || '')
      } catch (error) {
        console.error('Error fetching user:', error)
        router.push('/auth/login')
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [router])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/auth/login')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  const handleUpdateProfile = async () => {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { display_name: displayName },
      })

      if (updateError) throw updateError

      setSuccess('Profile updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePassword = async () => {
    setSaving(true)
    setError('')
    setSuccess('')

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      setSaving(false)
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      setSaving(false)
      return
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) throw updateError

      setSuccess('Password updated successfully!')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure? This action cannot be undone. All your data will be deleted.')) {
      return
    }

    setSaving(true)
    setError('')

    try {
      // Delete user data from database first
      const { error: deleteTradesError } = await supabase
        .from('trades')
        .delete()
        .eq('user_id', user.id)

      if (deleteTradesError) throw deleteTradesError

      // Delete user account
      const { error: deleteUserError } = await supabase.auth.admin.deleteUser(user.id)

      if (deleteUserError) throw deleteUserError

      // Redirect to login
      router.push('/auth/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">TradeZilla</h1>
              <p className="text-gray-400 text-sm">Settings</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-400">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-6">
          <a
            href="/dashboard"
            className="py-4 px-2 text-gray-400 hover:text-white border-b-2 border-transparent hover:border-blue-600 transition"
          >
            Dashboard
          </a>
          <a
            href="/analytics"
            className="py-4 px-2 text-gray-400 hover:text-white border-b-2 border-transparent hover:border-blue-600 transition"
          >
            Analytics
          </a>
          <a
            href="/settings"
            className="py-4 px-2 text-blue-400 border-b-2 border-blue-600"
          >
            Settings
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-slate-900 rounded-lg p-4 sticky top-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-4 px-4">SETTINGS</h3>
              <nav className="space-y-2">
                {[
                  { id: 'profile', label: '👤 Profile', icon: '👤' },
                  { id: 'preferences', label: '⚙️ Preferences', icon: '⚙️' },
                  { id: 'password', label: '🔑 Password', icon: '🔑' },
                  { id: 'danger', label: '⚠️ Danger Zone', icon: '⚠️' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id as any)}
                    className={`w-full text-left px-4 py-3 rounded transition ${
                      tab === item.id
                        ? 'bg-blue-600 text-white font-medium'
                        : 'text-gray-300 hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
          {/* Profile Tab */}
          {tab === 'profile' && (
            <div className="bg-slate-900 rounded-lg p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Profile</h2>

              {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-500/20 border border-green-500 text-green-200 px-4 py-3 rounded mb-4">
                  {success}
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-gray-400 cursor-not-allowed"
                  />
                  <p className="text-gray-400 text-xs mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  onClick={handleUpdateProfile}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded transition"
                >
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {tab === 'preferences' && (
            <div className="bg-slate-900 rounded-lg p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Preferences</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Theme
                  </label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="dark">Dark (Default)</option>
                    <option value="light" disabled>Light (Coming soon)</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailNotifications}
                      onChange={(e) => setEmailNotifications(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-gray-300">
                      Email me about significant trading milestones
                    </span>
                  </label>
                </div>

                <p className="text-gray-400 text-sm">
                  More preferences coming soon! 🚀
                </p>
              </div>
            </div>
          )}

          {/* Password Tab */}
          {tab === 'password' && (
            <div className="bg-slate-900 rounded-lg p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Change Password</h2>

              {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-500/20 border border-green-500 text-green-200 px-4 py-3 rounded mb-4">
                  {success}
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  onClick={handleUpdatePassword}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded transition"
                >
                  {saving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>
          )}

          {/* Danger Zone Tab */}
          {tab === 'danger' && (
            <div className="bg-slate-900 rounded-lg p-8">
              <h2 className="text-2xl font-bold text-red-500 mb-6">Danger Zone</h2>

              {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-red-400 mb-2">Delete Account</h3>
                <p className="text-gray-300 mb-4">
                  This action will permanently delete your account and all your trading data. 
                  This cannot be undone.
                </p>
                <button
                  onClick={handleDeleteAccount}
                  disabled={saving}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded transition"
                >
                  {saving ? 'Deleting...' : 'Delete My Account'}
                </button>
              </div>
            </div>
          )}
          </div>
        </div>
      </main>
    </div>
  )
}

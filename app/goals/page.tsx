'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTradeStore } from '@/lib/store'

interface Goal {
  id: string
  user_id: string
  type: 'monthly_pnl' | 'win_rate' | 'monthly_trades'
  target: number
  current: number
  month: string
  created_at: string
}

export default function GoalsPage() {
  const router = useRouter()
  const { trades } = useTradeStore()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [goals, setGoals] = useState<Goal[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form states
  const [goalType, setGoalType] = useState<'monthly_pnl' | 'win_rate' | 'monthly_trades'>(
    'monthly_pnl'
  )
  const [targetValue, setTargetValue] = useState('')

  const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

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
        await fetchGoals(user.id)
      } catch (error) {
        console.error('Error fetching user:', error)
        router.push('/auth/login')
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [router])

  const fetchGoals = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setGoals(data || [])
    } catch (err) {
      console.error('Error fetching goals:', err)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/auth/login')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  const handleCreateGoal = async () => {
    setSaving(true)
    setError('')

    try {
      if (!user) throw new Error('User not found')
      if (!targetValue || parseFloat(targetValue) <= 0) {
        setError('Please enter a valid target value')
        setSaving(false)
        return
      }

      const { error: insertError } = await supabase.from('goals').insert([
        {
          user_id: user.id,
          type: goalType,
          target: parseFloat(targetValue),
          current: 0,
          month: currentMonth,
        },
      ])

      if (insertError) throw insertError

      await fetchGoals(user.id)
      setShowForm(false)
      setTargetValue('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create goal')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Delete this goal?')) return

    try {
      const { error: deleteError } = await supabase.from('goals').delete().eq('id', goalId)

      if (deleteError) throw deleteError

      await fetchGoals(user.id)
    } catch (err) {
      console.error('Error deleting goal:', err)
    }
  }

  // Calculate current progress
  const getGoalProgress = (goal: Goal) => {
    const monthTrades = trades.filter(
      (t: any) => new Date(t.entry_date).toISOString().slice(0, 7) === goal.month
    )

    if (goal.type === 'monthly_pnl') {
      return monthTrades.reduce((sum: number, t: any) => sum + t.pnl, 0)
    } else if (goal.type === 'win_rate') {
      if (monthTrades.length === 0) return 0
      const wins = monthTrades.filter((t: any) => t.pnl > 0).length
      return (wins / monthTrades.length) * 100
    } else if (goal.type === 'monthly_trades') {
      return monthTrades.length
    }
    return 0
  }

  const getGoalLabel = (type: string) => {
    switch (type) {
      case 'monthly_pnl':
        return 'Monthly P&L Target'
      case 'win_rate':
        return 'Win Rate Target (%)'
      case 'monthly_trades':
        return 'Monthly Trades Target'
      default:
        return 'Goal'
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
              <p className="text-gray-400 text-sm">Trading Goals</p>
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
            href="/goals"
            className="py-4 px-2 text-blue-400 border-b-2 border-blue-600"
          >
            Goals
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white">Your Trading Goals</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
          >
            {showForm ? 'Cancel' : 'Add Goal'}
          </button>
        </div>

        {/* Create Goal Form */}
        {showForm && (
          <div className="bg-slate-900 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Create New Goal</h3>

            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Goal Type
                </label>
                <select
                  value={goalType}
                  onChange={(e) =>
                    setGoalType(e.target.value as 'monthly_pnl' | 'win_rate' | 'monthly_trades')
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="monthly_pnl">Monthly P&L Target ($)</option>
                  <option value="win_rate">Win Rate Target (%)</option>
                  <option value="monthly_trades">Monthly Trades Target</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Target Value
                </label>
                <input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder={
                    goalType === 'monthly_pnl'
                      ? '1000'
                      : goalType === 'win_rate'
                        ? '60'
                        : '20'
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                onClick={handleCreateGoal}
                disabled={saving}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded transition"
              >
                {saving ? 'Creating...' : 'Create Goal'}
              </button>
            </div>
          </div>
        )}

        {/* Goals List */}
        {goals.length === 0 ? (
          <div className="bg-slate-900 rounded-lg p-8 text-center">
            <p className="text-gray-400 mb-4">No goals yet. Set your first trading goal!</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
            >
              Create Goal
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {goals.map((goal) => {
              const progress = getGoalProgress(goal)
              const percentage = Math.min((progress / goal.target) * 100, 100)
              const isCompleted = progress >= goal.target

              return (
                <div key={goal.id} className="bg-slate-900 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {getGoalLabel(goal.type)}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {new Date(goal.month + '-01').toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded transition"
                    >
                      Delete
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          isCompleted ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-gray-400 text-sm">Progress</p>
                      <p className="text-xl font-bold text-white">
                        {progress.toFixed(goal.type === 'win_rate' ? 1 : 0)}
                        {goal.type === 'win_rate' && '%'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Target</p>
                      <p className="text-xl font-bold text-gray-300">
                        {goal.target}
                        {goal.type === 'win_rate' && '%'}
                      </p>
                    </div>
                    <div>
                      {isCompleted ? (
                        <div className="text-center">
                          <p className="text-2xl">🎉</p>
                          <p className="text-green-400 text-sm font-semibold">Completed!</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="text-gray-400 text-xs mb-1">Remaining</p>
                          <p className="text-lg font-bold text-orange-400">
                            {(goal.target - progress).toFixed(goal.type === 'win_rate' ? 1 : 0)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

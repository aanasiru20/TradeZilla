'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTradeStore } from '@/lib/store'
import { TradeStats } from '@/components/TradeStats'
import TradeForm from '@/components/TradeForm'
import TradeModal from '@/components/TradeModal'
import DeleteConfirm from '@/components/DeleteConfirm'
import TradeFilters from '@/components/TradeFilters'
import { exportToCSV } from '@/lib/exportCSV'

export default function DashboardPage() {
  const router = useRouter()
  const { trades, setTrades } = useTradeStore()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTrade, setEditingTrade] = useState<any>(null)
  const [deletingTradeId, setDeletingTradeId] = useState<string | null>(null)
  const [filteredTrades, setFilteredTrades] = useState<any[]>([])

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

        // Fetch user's trades
        const { data, error } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .order('entry_date', { ascending: false })

        if (error) throw error

        setTrades(data || [])
      } catch (error) {
        console.error('Error fetching user:', error)
        router.push('/auth/login')
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [router, setTrades])

  // Update filtered trades when trades change
  useEffect(() => {
    setFilteredTrades(trades)
  }, [trades])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/auth/login')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  const handleRefresh = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false })

      if (error) throw error

      setTrades(data || [])
    } catch (error) {
      console.error('Error refreshing trades:', error)
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
              <p className="text-gray-400 text-sm">Trading Journal</p>
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
            className="py-4 px-2 text-blue-400 border-b-2 border-blue-600"
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
            href="/performance"
            className="py-4 px-2 text-gray-400 hover:text-white border-b-2 border-transparent hover:border-blue-600 transition"
          >
            Performance
          </a>
          <a
            href="/goals"
            className="py-4 px-2 text-gray-400 hover:text-white border-b-2 border-transparent hover:border-blue-600 transition"
          >
            Goals
          </a>
          <a
            href="/import"
            className="py-4 px-2 text-gray-400 hover:text-white border-b-2 border-transparent hover:border-blue-600 transition"
          >
            Import
          </a>
          <a
            href="/settings"
            className="py-4 px-2 text-gray-400 hover:text-white border-b-2 border-transparent hover:border-blue-600 transition"
          >
            Settings
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Overview</h2>
          <TradeStats />
        </div>

        {/* Add Trade Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Trades</h2>
            <div className="flex gap-3">
              <button
                onClick={() => exportToCSV(filteredTrades, `trades_${new Date().toISOString().split('T')[0]}.csv`)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition"
              >
                Export CSV
              </button>
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
              >
                {showForm ? 'Cancel' : 'Add Trade'}
              </button>
            </div>
          </div>

          {showForm && (
            <div className="bg-slate-900 rounded-lg p-6 mb-6">
              <TradeForm onSuccess={() => {
                setShowForm(false)
                handleRefresh()
              }} />
            </div>
          )}
        </div>

        {/* Filters */}
        {trades.length > 0 && (
          <TradeFilters trades={trades} onFilterChange={setFilteredTrades} />
        )}

        {/* Trades List */}
        {trades.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[400px] shadow-2xl">
            <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
              <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">No Trades Yet!</h3>
            <p className="text-gray-400 max-w-md mx-auto mb-8">
              Your trading journal is empty. Connect your exchange to automatically sync your history, or add your first trade manually.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => router.push('/import')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg transition transform hover:-translate-y-1 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Auto-Sync Exchange
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg shadow transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add Manually
              </button>
            </div>
          </div>
        ) : filteredTrades.length === 0 ? (
          <div className="bg-slate-900 rounded-lg p-8 text-center">
            <p className="text-gray-400">No trades match your filters.</p>
          </div>
        ) : (
          <div className="bg-slate-900 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800 border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                      Symbol
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                      Entry
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                      Exit
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                      P&L
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                      P&L %
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredTrades.map((trade: any) => (
                    <tr
                      key={trade.id}
                      className="hover:bg-slate-800 transition"
                    >
                      <td className="px-6 py-4 text-white font-medium">
                        {trade.symbol}
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        ${parseFloat(trade.entry_price).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        ${parseFloat(trade.exit_price).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {trade.quantity}
                      </td>
                      <td
                        className={`px-6 py-4 font-medium ${
                          trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        ${parseFloat(trade.pnl).toFixed(2)}
                      </td>
                      <td
                        className={`px-6 py-4 font-medium ${
                          trade.pnl_percent >= 0
                            ? 'text-green-400'
                            : 'text-red-400'
                        }`}
                      >
                        {parseFloat(trade.pnl_percent).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {new Date(trade.entry_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingTrade(trade)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeletingTradeId(trade.id)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Edit Modal */}
      <TradeModal
        trade={editingTrade}
        isOpen={!!editingTrade}
        onClose={() => setEditingTrade(null)}
        onSuccess={handleRefresh}
      />

      {/* Delete Confirmation */}
      <DeleteConfirm
        tradeId={deletingTradeId || ''}
        tradeSymbol={
          trades.find((t: any) => t.id === deletingTradeId)?.symbol || ''
        }
        isOpen={!!deletingTradeId}
        onClose={() => setDeletingTradeId(null)}
        onSuccess={handleRefresh}
      />
    </div>
  )
}

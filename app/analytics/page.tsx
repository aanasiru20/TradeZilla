'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTradeStore } from '@/lib/store'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export default function AnalyticsPage() {
  const router = useRouter()
  const { trades } = useTradeStore()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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

  // Calculate metrics
  const metrics = {
    totalTrades: trades.length,
    winningTrades: trades.filter((t: any) => t.pnl > 0).length,
    losingTrades: trades.filter((t: any) => t.pnl < 0).length,
    breakEvenTrades: trades.filter((t: any) => t.pnl === 0).length,
    totalPnL: trades.reduce((sum: number, t: any) => sum + t.pnl, 0),
    winRate:
      trades.length > 0
        ? ((trades.filter((t: any) => t.pnl > 0).length / trades.length) * 100).toFixed(2)
        : 0,
    avgWin:
      trades.filter((t: any) => t.pnl > 0).length > 0
        ? (
            trades
              .filter((t: any) => t.pnl > 0)
              .reduce((sum: number, t: any) => sum + t.pnl, 0) /
            trades.filter((t: any) => t.pnl > 0).length
          ).toFixed(2)
        : 0,
    avgLoss:
      trades.filter((t: any) => t.pnl < 0).length > 0
        ? (
            trades
              .filter((t: any) => t.pnl < 0)
              .reduce((sum: number, t: any) => sum + t.pnl, 0) /
            trades.filter((t: any) => t.pnl < 0).length
          ).toFixed(2)
        : 0,
    bestTrade: trades.length > 0 ? Math.max(...trades.map((t: any) => t.pnl)) : 0,
    worstTrade: trades.length > 0 ? Math.min(...trades.map((t: any) => t.pnl)) : 0,
  }

  // P&L over time data
  const pnlOverTime = trades
    .sort((a: any, b: any) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime())
    .reduce((acc: any[], trade: any) => {
      const cumulativePnL =
        acc.length > 0 ? acc[acc.length - 1].cumulativePnL + trade.pnl : trade.pnl
      return [
        ...acc,
        {
          date: new Date(trade.entry_date).toLocaleDateString(),
          pnl: parseFloat(trade.pnl.toFixed(2)),
          cumulativePnL: parseFloat(cumulativePnL.toFixed(2)),
        },
      ]
    }, [])

  // Win/Loss pie chart
  const winLossData = [
    { name: 'Wins', value: metrics.winningTrades, color: '#4ade80' },
    { name: 'Losses', value: metrics.losingTrades, color: '#ef4444' },
    { name: 'Break Even', value: metrics.breakEvenTrades, color: '#6b7280' },
  ].filter((item) => item.value > 0)

  // Trades by symbol
  const tradesBySymbol = Object.entries(
    trades.reduce((acc: any, trade: any) => {
      acc[trade.symbol] = (acc[trade.symbol] || 0) + 1
      return acc
    }, {})
  )
    .map(([symbol, count]: any) => ({
      symbol,
      count,
    }))
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 10)

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
              <p className="text-gray-400 text-sm">Analytics</p>
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
            className="py-4 px-2 text-blue-400 border-b-2 border-blue-600"
          >
            Analytics
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {trades.length === 0 ? (
          <div className="bg-slate-900 rounded-lg p-8 text-center">
            <p className="text-gray-400">No trades yet. Add trades to see analytics!</p>
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-900 rounded-lg p-6">
                <div className="text-gray-400 text-sm mb-2">Total Trades</div>
                <div className="text-3xl font-bold text-white">
                  {metrics.totalTrades}
                </div>
              </div>
              <div className="bg-slate-900 rounded-lg p-6">
                <div className="text-gray-400 text-sm mb-2">Win Rate</div>
                <div className="text-3xl font-bold text-green-400">
                  {metrics.winRate}%
                </div>
              </div>
              <div className="bg-slate-900 rounded-lg p-6">
                <div className="text-gray-400 text-sm mb-2">Total P&L</div>
                <div
                  className={`text-3xl font-bold ${
                    metrics.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  ${metrics.totalPnL.toFixed(2)}
                </div>
              </div>
              <div className="bg-slate-900 rounded-lg p-6">
                <div className="text-gray-400 text-sm mb-2">Best Trade</div>
                <div className="text-3xl font-bold text-green-400">
                  ${metrics.bestTrade.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* P&L Over Time */}
              <div className="bg-slate-900 rounded-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4">P&L Over Time</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={pnlOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="date"
                      stroke="#9ca3af"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                      }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="cumulativePnL"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Win/Loss Pie */}
              <div className="bg-slate-900 rounded-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4">Win/Loss Distribution</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={winLossData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {winLossData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-900 rounded-lg p-6">
                <div className="text-gray-400 text-sm mb-2">Wins</div>
                <div className="text-2xl font-bold text-green-400">
                  {metrics.winningTrades}
                </div>
              </div>
              <div className="bg-slate-900 rounded-lg p-6">
                <div className="text-gray-400 text-sm mb-2">Losses</div>
                <div className="text-2xl font-bold text-red-400">
                  {metrics.losingTrades}
                </div>
              </div>
              <div className="bg-slate-900 rounded-lg p-6">
                <div className="text-gray-400 text-sm mb-2">Avg Win</div>
                <div className="text-2xl font-bold text-green-400">
                  ${metrics.avgWin}
                </div>
              </div>
              <div className="bg-slate-900 rounded-lg p-6">
                <div className="text-gray-400 text-sm mb-2">Avg Loss</div>
                <div className="text-2xl font-bold text-red-400">
                  ${metrics.avgLoss}
                </div>
              </div>
            </div>

            {/* Trades by Symbol */}
            {tradesBySymbol.length > 0 && (
              <div className="bg-slate-900 rounded-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4">Top Traded Symbols</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={tradesBySymbol}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="symbol" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                      }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

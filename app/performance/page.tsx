'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTradeStore } from '@/lib/store'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface SymbolStats {
  symbol: string
  trades: number
  wins: number
  losses: number
  winRate: number
  totalPnL: number
  avgPnL: number
  bestTrade: number
  worstTrade: number
}

interface MonthlyStats {
  month: string
  totalTrades: number
  totalPnL: number
  winRate: number
}

export default function PerformancePage() {
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

  // Calculate per-symbol statistics
  const getSymbolStats = (): SymbolStats[] => {
    const symbolMap = new Map<string, any[]>()

    trades.forEach((trade: any) => {
      if (!symbolMap.has(trade.symbol)) {
        symbolMap.set(trade.symbol, [])
      }
      symbolMap.get(trade.symbol)!.push(trade)
    })

    return Array.from(symbolMap.entries())
      .map(([symbol, symbolTrades]) => {
        const wins = symbolTrades.filter((t) => t.pnl > 0).length
        const losses = symbolTrades.filter((t) => t.pnl < 0).length
        const totalPnL = symbolTrades.reduce((sum, t) => sum + t.pnl, 0)
        const bestTrade = Math.max(...symbolTrades.map((t) => t.pnl))
        const worstTrade = Math.min(...symbolTrades.map((t) => t.pnl))

        return {
          symbol,
          trades: symbolTrades.length,
          wins,
          losses,
          winRate: (wins / symbolTrades.length) * 100,
          totalPnL,
          avgPnL: totalPnL / symbolTrades.length,
          bestTrade,
          worstTrade,
        }
      })
      .sort((a, b) => b.trades - a.trades)
  }

  // Calculate monthly statistics
  const getMonthlyStats = (): MonthlyStats[] => {
    const monthMap = new Map<string, any[]>()

    trades.forEach((trade: any) => {
      const month = new Date(trade.entry_date).toISOString().slice(0, 7)
      if (!monthMap.has(month)) {
        monthMap.set(month, [])
      }
      monthMap.get(month)!.push(trade)
    })

    return Array.from(monthMap.entries())
      .map(([month, monthTrades]) => {
        const wins = monthTrades.filter((t) => t.pnl > 0).length
        const totalPnL = monthTrades.reduce((sum, t) => sum + t.pnl, 0)

        return {
          month: new Date(month + '-01').toLocaleDateString('en-US', {
            month: 'short',
            year: '2-digit',
          }),
          totalTrades: monthTrades.length,
          totalPnL,
          winRate: monthTrades.length > 0 ? (wins / monthTrades.length) * 100 : 0,
        }
      })
      .sort((a, b) => a.month.localeCompare(b.month))
  }

  const symbolStats = getSymbolStats()
  const monthlyStats = getMonthlyStats()

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
              <p className="text-gray-400 text-sm">Performance Metrics</p>
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
            href="/performance"
            className="py-4 px-2 text-blue-400 border-b-2 border-blue-600"
          >
            Performance
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {trades.length === 0 ? (
          <div className="bg-slate-900 rounded-lg p-8 text-center">
            <p className="text-gray-400">No trades yet. Add trades to see performance metrics!</p>
          </div>
        ) : (
          <>
            {/* Monthly Performance Chart */}
            {monthlyStats.length > 0 && (
              <div className="bg-slate-900 rounded-lg p-6 mb-8">
                <h2 className="text-xl font-bold text-white mb-4">Monthly Performance</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9ca3af" />
                    <YAxis yAxisId="left" stroke="#9ca3af" />
                    <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                      }}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="totalPnL"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="Total P&L ($)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="winRate"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Win Rate (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Per-Symbol Statistics Table */}
            {symbolStats.length > 0 && (
              <div className="bg-slate-900 rounded-lg p-6 mb-8">
                <h2 className="text-xl font-bold text-white mb-4">Performance by Symbol</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800 border-b border-slate-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-gray-300">Symbol</th>
                        <th className="px-4 py-3 text-left text-gray-300">Trades</th>
                        <th className="px-4 py-3 text-left text-gray-300">Wins</th>
                        <th className="px-4 py-3 text-left text-gray-300">Losses</th>
                        <th className="px-4 py-3 text-left text-gray-300">Win Rate</th>
                        <th className="px-4 py-3 text-left text-gray-300">Total P&L</th>
                        <th className="px-4 py-3 text-left text-gray-300">Avg P&L</th>
                        <th className="px-4 py-3 text-left text-gray-300">Best Trade</th>
                        <th className="px-4 py-3 text-left text-gray-300">Worst Trade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {symbolStats.map((stat) => (
                        <tr key={stat.symbol} className="hover:bg-slate-800">
                          <td className="px-4 py-3 text-white font-semibold">
                            {stat.symbol}
                          </td>
                          <td className="px-4 py-3 text-gray-300">{stat.trades}</td>
                          <td className="px-4 py-3 text-green-400">{stat.wins}</td>
                          <td className="px-4 py-3 text-red-400">{stat.losses}</td>
                          <td className="px-4 py-3 text-gray-300">
                            {stat.winRate.toFixed(1)}%
                          </td>
                          <td
                            className={`px-4 py-3 font-semibold ${
                              stat.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}
                          >
                            ${stat.totalPnL.toFixed(2)}
                          </td>
                          <td
                            className={`px-4 py-3 ${
                              stat.avgPnL >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}
                          >
                            ${stat.avgPnL.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-green-400">
                            ${stat.bestTrade.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-red-400">
                            ${stat.worstTrade.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Trades Distribution Chart */}
            {symbolStats.length > 0 && (
              <div className="bg-slate-900 rounded-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4">Trades by Symbol</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={symbolStats.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="symbol" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                      }}
                    />
                    <Bar dataKey="trades" fill="#3b82f6" />
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

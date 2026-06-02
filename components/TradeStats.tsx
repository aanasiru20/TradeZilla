'use client'

import { useEffect, useState } from 'react'
import { useTradeStore } from '@/lib/store'

export function TradeStats() {
  const trades = useTradeStore((state) => state.trades)
  const [stats, setStats] = useState({
    totalTrades: 0,
    winRate: 0,
    totalPnL: 0,
    avgWin: 0,
    avgLoss: 0,
  })

  useEffect(() => {
    if (trades.length === 0) return

    const winningTrades = trades.filter((t) => t.pnl > 0)
    const losingTrades = trades.filter((t) => t.pnl < 0)

    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0)
    const avgWin =
      winningTrades.length > 0
        ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length
        : 0
    const avgLoss =
      losingTrades.length > 0
        ? losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length
        : 0

    setStats({
      totalTrades: trades.length,
      winRate: (winningTrades.length / trades.length) * 100,
      totalPnL,
      avgWin,
      avgLoss,
    })
  }, [trades])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <StatCard label="Total Trades" value={stats.totalTrades} />
      <StatCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} />
      <StatCard label="Total P&L" value={`$${stats.totalPnL.toFixed(2)}`} />
      <StatCard label="Avg Win" value={`$${stats.avgWin.toFixed(2)}`} />
      <StatCard label="Avg Loss" value={`$${stats.avgLoss.toFixed(2)}`} />
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}

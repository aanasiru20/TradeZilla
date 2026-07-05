'use client'

import { useState, useEffect } from 'react'

interface FilterProps {
  trades: any[]
  onFilterChange: (filtered: any[]) => void
}

export default function TradeFilters({ trades, onFilterChange }: FilterProps) {
  const [searchSymbol, setSearchSymbol] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [minPnL, setMinPnL] = useState('')
  const [maxPnL, setMaxPnL] = useState('')
  const [winOnly, setWinOnly] = useState(false)
  const [lossOnly, setLossOnly] = useState(false)

  // Apply filters
  const applyFilters = () => {
    let filtered = [...trades]

    // Symbol filter
    if (searchSymbol.trim()) {
      filtered = filtered.filter((t) =>
        t.symbol.toUpperCase().includes(searchSymbol.toUpperCase())
      )
    }

    // Date range filter
    if (startDate) {
      filtered = filtered.filter((t) => new Date(t.entry_date) >= new Date(startDate))
    }
    if (endDate) {
      filtered = filtered.filter((t) => new Date(t.entry_date) <= new Date(endDate))
    }

    // P&L range filter
    if (minPnL !== '') {
      filtered = filtered.filter((t) => t.pnl >= parseFloat(minPnL))
    }
    if (maxPnL !== '') {
      filtered = filtered.filter((t) => t.pnl <= parseFloat(maxPnL))
    }

    // Win/Loss filter
    if (winOnly) {
      filtered = filtered.filter((t) => t.pnl > 0)
    }
    if (lossOnly) {
      filtered = filtered.filter((t) => t.pnl < 0)
    }

    onFilterChange(filtered)
  }

  const handleReset = () => {
    setSearchSymbol('')
    setStartDate('')
    setEndDate('')
    setMinPnL('')
    setMaxPnL('')
    setWinOnly(false)
    setLossOnly(false)
    onFilterChange(trades)
  }

  // Apply filters whenever any filter changes
  useEffect(() => {
    applyFilters()
  }, [searchSymbol, startDate, endDate, minPnL, maxPnL, winOnly, lossOnly, trades])

  return (
    <div className="bg-slate-900 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-white mb-4">Filters</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {/* Symbol Search */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Symbol
          </label>
          <input
            type="text"
            value={searchSymbol}
            onChange={(e) => setSearchSymbol(e.target.value)}
            placeholder="Search symbol..."
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            From Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            To Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Min P&L */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Min P&L
          </label>
          <input
            type="number"
            value={minPnL}
            onChange={(e) => setMinPnL(e.target.value)}
            placeholder="Min P&L"
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Max P&L */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Max P&L
          </label>
          <input
            type="number"
            value={maxPnL}
            onChange={(e) => setMaxPnL(e.target.value)}
            placeholder="Max P&L"
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Checkboxes */}
      <div className="flex gap-6 mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={winOnly}
            onChange={(e) => setWinOnly(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <span className="text-gray-300 text-sm">Winning Trades Only</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={lossOnly}
            onChange={(e) => setLossOnly(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <span className="text-gray-300 text-sm">Losing Trades Only</span>
        </label>
      </div>

      {/* Reset Button */}
      <button
        onClick={handleReset}
        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition text-sm"
      >
        Reset Filters
      </button>
    </div>
  )
}

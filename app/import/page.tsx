'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTradeStore } from '@/lib/store'
import { parseCSV } from '@/lib/csvParser'

interface ParsedTrade {
  symbol: string
  entry_price: number
  exit_price: number
  quantity: number
  entry_date: string
  exit_date: string
  notes: string
  pnl: number
  pnl_percent: number
}

export default function ImportPage() {
  const router = useRouter()
  const { setTrades } = useTradeStore()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [parsedTrades, setParsedTrades] = useState<ParsedTrade[]>([])
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [step, setStep] = useState<'upload' | 'preview' | 'complete'>('upload')

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setError('')
    setFile(selectedFile)

    try {
      const trades = await parseCSV(selectedFile)
      if (trades.length === 0) {
        setError('No valid trades found in CSV. Check the format.')
        return
      }
      setParsedTrades(trades)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV')
    }
  }

  const handleImport = async () => {
    if (!user || parsedTrades.length === 0) return

    setImporting(true)
    setError('')

    try {
      const tradesToInsert = parsedTrades.map((trade) => ({
        user_id: user.id,
        symbol: trade.symbol,
        entry_price: trade.entry_price,
        exit_price: trade.exit_price,
        quantity: trade.quantity,
        entry_date: trade.entry_date,
        exit_date: trade.exit_date,
        pnl: trade.pnl,
        pnl_percent: trade.pnl_percent,
        notes: trade.notes,
      }))

      const { data, error: insertError } = await supabase
        .from('trades')
        .insert(tradesToInsert)
        .select()

      if (insertError) throw insertError

      // Fetch all trades to update store
      const { data: allTrades, error: fetchError } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false })

      if (fetchError) throw fetchError

      setTrades(allTrades || [])
      setSuccess(`Successfully imported ${data?.length || 0} trades!`)
      setStep('complete')
      setParsedTrades([])
      setFile(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import trades')
    } finally {
      setImporting(false)
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
              <p className="text-gray-400 text-sm">Import Trades</p>
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
            href="/import"
            className="py-4 px-2 text-blue-400 border-b-2 border-blue-600"
          >
            Import
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="bg-slate-900 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Import Trades from CSV</h2>

            <div className="mb-8 p-6 bg-slate-800 border-2 border-dashed border-slate-700 rounded-lg">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-input"
              />
              <label
                htmlFor="csv-input"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <div className="text-6xl mb-4">📁</div>
                <p className="text-white text-lg font-medium mb-2">
                  Click to upload CSV file
                </p>
                <p className="text-gray-400 text-sm">
                  Supports Binance, Bitget, and generic CSV formats
                </p>
              </label>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <div className="bg-blue-500/10 border border-blue-500/30 text-blue-200 px-4 py-3 rounded mb-6">
              <p className="font-semibold mb-2">📋 Supported CSV Formats:</p>
              <ul className="text-sm space-y-1">
                <li>• <strong>Binance:</strong> Symbol, Entry Price, Exit Price, Qty, Entry Date, Exit Date</li>
                <li>• <strong>Bitget:</strong> Pair, Entry Price, Exit Price, Amount, Entry Time, Exit Time</li>
                <li>• <strong>Generic:</strong> Any CSV with similar column names</li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 'preview' && (
          <div className="bg-slate-900 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-white mb-6">
              Preview - {parsedTrades.length} trades found
            </h2>

            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm">
                <thead className="bg-slate-800 border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-300">Symbol</th>
                    <th className="px-4 py-2 text-left text-gray-300">Entry</th>
                    <th className="px-4 py-2 text-left text-gray-300">Exit</th>
                    <th className="px-4 py-2 text-left text-gray-300">Qty</th>
                    <th className="px-4 py-2 text-left text-gray-300">P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {parsedTrades.slice(0, 5).map((trade, idx) => (
                    <tr key={idx} className="hover:bg-slate-800">
                      <td className="px-4 py-2 text-white font-medium">
                        {trade.symbol}
                      </td>
                      <td className="px-4 py-2 text-gray-300">
                        ${trade.entry_price.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-gray-300">
                        ${trade.exit_price.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-gray-300">
                        {trade.quantity}
                      </td>
                      <td
                        className={`px-4 py-2 font-medium ${
                          trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        ${trade.pnl.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedTrades.length > 5 && (
                <p className="text-gray-400 text-sm mt-2 text-center">
                  ... and {parsedTrades.length - 5} more trades
                </p>
              )}
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setStep('upload')
                  setParsedTrades([])
                  setFile(null)
                }}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded transition"
              >
                {importing ? 'Importing...' : 'Import Trades'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 'complete' && (
          <div className="bg-slate-900 rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-white mb-2">Import Complete!</h2>
            <p className="text-gray-400 mb-6">{success}</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
              >
                View Dashboard
              </button>
              <button
                onClick={() => {
                  setStep('upload')
                  setSuccess('')
                }}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition"
              >
                Import More
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

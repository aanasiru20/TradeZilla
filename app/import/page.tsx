'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTradeStore } from '@/lib/store'
import Papa from 'papaparse'

interface MappedFields {
  symbol: string
  entry_price: string
  exit_price: string
  quantity: string
  entry_date: string
  exit_date: string
  notes: string
}

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
  isValid: boolean
  errors: string[]
}

export default function ImportPage() {
  const router = useRouter()
  const { setTrades } = useTradeStore()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Mode: 'select' | 'csv' | 'sync'
  const [importMode, setImportMode] = useState<'select' | 'csv' | 'sync'>('select')

  // CSV States
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [rawCsvRows, setRawCsvRows] = useState<any[]>([])
  const [mappedFields, setMappedFields] = useState<MappedFields>({
    symbol: '',
    entry_price: '',
    exit_price: '',
    quantity: '',
    entry_date: '',
    exit_date: '',
    notes: ''
  })
  const [parsedTrades, setParsedTrades] = useState<ParsedTrade[]>([])
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'complete'>('upload')

  // Sync States
  const [selectedExchange, setSelectedExchange] = useState<'binance' | 'bitget'>('binance')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [syncSymbol, setSyncSymbol] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncLogs, setSyncLogs] = useState<string[]>([])

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

  // ----------------------------------------------------
  // CSV Import Handlers
  // ----------------------------------------------------
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setError('')
    setSuccess('')

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || []
        if (headers.length === 0) {
          setError('Invalid CSV format. No headers found.')
          return
        }

        setCsvHeaders(headers)
        setRawCsvRows(results.data)

        // Auto-detect mappings based on header name matches
        const autoMapped = autoDetectMappings(headers)
        setMappedFields(autoMapped)

        // If auto-detection succeeded for required fields, go to preview. Otherwise, prompt mapping.
        const requiredFieldsMapped = 
          autoMapped.symbol && 
          autoMapped.entry_price && 
          autoMapped.exit_price && 
          autoMapped.quantity && 
          autoMapped.entry_date && 
          autoMapped.exit_date

        if (requiredFieldsMapped) {
          generateParsedTrades(results.data, autoMapped)
          setStep('preview')
        } else {
          setStep('mapping')
        }
      },
      error: (err) => {
        setError(`Failed to read CSV: ${err.message}`)
      }
    })
  }

  const autoDetectMappings = (headers: string[]): MappedFields => {
    const detect = (keys: string[]): string => {
      const found = headers.find(h => 
        keys.some(k => h.toLowerCase().trim().replace(/[^a-z0-9]/g, '') === k.toLowerCase().replace(/[^a-z0-9]/g, ''))
      )
      return found || ''
    }

    return {
      symbol: detect(['symbol', 'pair', 'asset', 'ticker']),
      entry_price: detect(['entryprice', 'entry_price', 'buyprice', 'buy_price', 'price', 'entry']),
      exit_price: detect(['exitprice', 'exit_price', 'sellprice', 'sell_price', 'exit']),
      quantity: detect(['quantity', 'qty', 'amount', 'volume', 'size', 'units']),
      entry_date: detect(['entrydate', 'entry_date', 'buydate', 'buy_time', 'entrytime', 'entry_time', 'time']),
      exit_date: detect(['exitdate', 'exit_date', 'selldate', 'sell_time', 'exittime', 'exit_time']),
      notes: detect(['notes', 'comment', 'description', 'remarks'])
    }
  }

  const handleMappingChange = (field: keyof MappedFields, val: string) => {
    const updated = { ...mappedFields, [field]: val }
    setMappedFields(updated)
    generateParsedTrades(rawCsvRows, updated)
  }

  const generateParsedTrades = (rows: any[], mappings: MappedFields) => {
    const parsed: ParsedTrade[] = rows.map((row) => {
      const errors: string[] = []
      
      const symbol = String(row[mappings.symbol] || '').trim().toUpperCase()
      const entryPriceRaw = parseFloat(row[mappings.entry_price])
      const exitPriceRaw = parseFloat(row[mappings.exit_price])
      const qtyRaw = parseFloat(row[mappings.quantity])
      const entryDateRaw = row[mappings.entry_date]
      const exitDateRaw = row[mappings.exit_date]
      const notes = mappings.notes ? String(row[mappings.notes] || '').trim() : ''

      // Validations
      if (!symbol) errors.push('Symbol is missing.')
      if (isNaN(entryPriceRaw) || entryPriceRaw <= 0) errors.push('Entry price must be a number greater than 0.')
      if (isNaN(exitPriceRaw) || exitPriceRaw <= 0) errors.push('Exit price must be a number greater than 0.')
      if (isNaN(qtyRaw) || qtyRaw <= 0) errors.push('Quantity must be a number greater than 0.')
      
      let entry_date = ''
      try {
        const d = new Date(entryDateRaw)
        if (isNaN(d.getTime())) {
          errors.push('Entry date is invalid.')
        } else {
          entry_date = d.toISOString().split('T')[0]
        }
      } catch {
        errors.push('Entry date format is invalid.')
      }

      let exit_date = ''
      try {
        const d = new Date(exitDateRaw)
        if (isNaN(d.getTime())) {
          errors.push('Exit date is invalid.')
        } else {
          exit_date = d.toISOString().split('T')[0]
        }
      } catch {
        errors.push('Exit date format is invalid.')
      }

      const pnl = (exitPriceRaw - entryPriceRaw) * qtyRaw
      const pnl_percent = ((exitPriceRaw - entryPriceRaw) / entryPriceRaw) * 100

      return {
        symbol,
        entry_price: entryPriceRaw,
        exit_price: exitPriceRaw,
        quantity: qtyRaw,
        entry_date,
        exit_date,
        notes,
        pnl,
        pnl_percent,
        isValid: errors.length === 0,
        errors
      }
    })

    setParsedTrades(parsed)
  }

  const handleImportCSV = async () => {
    if (!user || parsedTrades.length === 0) return

    const validTrades = parsedTrades.filter(t => t.isValid)
    const invalidCount = parsedTrades.length - validTrades.length

    if (validTrades.length === 0) {
      setError('Cannot import. All trades have validation errors.')
      return
    }

    setImporting(true)
    setError('')

    try {
      const tradesToInsert = validTrades.map((trade) => ({
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
      setSuccess(`Successfully imported ${data?.length || 0} trades!${invalidCount > 0 ? ` (${invalidCount} invalid rows were skipped)` : ''}`)
      setStep('complete')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import trades')
    } finally {
      setImporting(false)
    }
  }

  // ----------------------------------------------------
  // Exchange Sync Handlers
  // ----------------------------------------------------
  const handleExchangeSync = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSyncing(true)
    setError('')
    setSuccess('')
    setSyncLogs(['Initializing connection client...', `Contacting ${selectedExchange.toUpperCase()} gateway...`])

    try {
      // Get current Supabase session JWT
      const session = (await supabase.auth.getSession()).data.session
      const token = session?.access_token || ''

      const isDemo = apiKey.toUpperCase().includes('DEMO') || apiSecret.toUpperCase().includes('DEMO') || apiKey.toLowerCase() === 'sandbox'
      if (isDemo) {
        setSyncLogs(prev => [...prev, 'Demo credentials detected. Launching sandboxed fetch...'])
      }

      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          exchange: selectedExchange,
          apiKey,
          apiSecret,
          passphrase: selectedExchange === 'bitget' ? passphrase : undefined,
          symbol: syncSymbol || undefined
        })
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Failed to sync with exchange.')
      }

      setSyncLogs(prev => [
        ...prev,
        'Retrieving trade fills logs...',
        'Matching order buy/sell execution details...',
        'Calculating P&L records...',
        `Database synced. Found ${result.tradesSynced} complete trades.`
      ])

      // Refresh store trades
      const { data: allTrades } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false })

      setTrades(allTrades || [])

      setSuccess(result.message)
      setApiKey('')
      setApiSecret('')
      setPassphrase('')
    } catch (err: any) {
      setError(err.message || 'Sync failed.')
      setSyncLogs(prev => [...prev, `❌ Error: ${err.message || 'Sync failed.'}`])
    } finally {
      setSyncing(false)
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
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">TradeZilla</h1>
              <p className="text-gray-400 text-sm">Imports Dashboard</p>
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* SELECT IMPORT MODE SCREEN */}
        {importMode === 'select' && (
          <div className="max-w-4xl mx-auto text-center mt-10">
            <h2 className="text-3xl font-bold mb-4">Choose Import Method</h2>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              Sync your transaction logs directly from your favorite exchanges or upload standard spreadsheets manually.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Option A: Auto-Sync */}
              <div 
                onClick={() => setImportMode('sync')}
                className="bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-500 rounded-xl p-8 cursor-pointer text-left transition duration-300 group"
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition">⚡</div>
                <h3 className="text-2xl font-bold mb-2">Direct Platform Auto-Sync</h3>
                <p className="text-gray-400 text-sm mb-6">
                  Securely link your Bitget or Binance accounts using API keys to sync your transaction records instantly.
                </p>
                <div className="text-blue-400 font-medium group-hover:translate-x-2 transition inline-flex items-center gap-1">
                  Connect Account &rarr;
                </div>
              </div>

              {/* Option B: Manual CSV */}
              <div 
                onClick={() => setImportMode('csv')}
                className="bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-purple-500 rounded-xl p-8 cursor-pointer text-left transition duration-300 group"
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition">📄</div>
                <h3 className="text-2xl font-bold mb-2">Manual CSV File Import</h3>
                <p className="text-gray-400 text-sm mb-6">
                  Upload trade spreadsheets from any broker. Drag-and-drop file mapping wizard to match customize columns.
                </p>
                <div className="text-purple-400 font-medium group-hover:translate-x-2 transition inline-flex items-center gap-1">
                  Upload File &rarr;
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 1. EXCHANGE SYNC INTERFACE */}
        {importMode === 'sync' && (
          <div className="max-w-2xl mx-auto bg-slate-900 rounded-lg border border-slate-800 p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Exchange Auto-Sync</h2>
              <button 
                onClick={() => {
                  setImportMode('select')
                  setError('')
                  setSuccess('')
                }}
                className="text-gray-400 hover:text-white transition text-sm"
              >
                &larr; Back to Selection
              </button>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-500/20 border border-green-500 text-green-200 px-4 py-3 rounded mb-6">
                {success}
              </div>
            )}

            <form onSubmit={handleExchangeSync} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Select Platform</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setSelectedExchange('binance')}
                    className={`py-3 rounded-lg border font-bold transition ${
                      selectedExchange === 'binance' 
                        ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' 
                        : 'bg-slate-800 border-slate-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    Binance
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedExchange('bitget')}
                    className={`py-3 rounded-lg border font-bold transition ${
                      selectedExchange === 'bitget' 
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400' 
                        : 'bg-slate-800 border-slate-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    Bitget
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">API Key</label>
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    required
                    placeholder="Enter Exchange Read-Only API Key"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">API Secret Key</label>
                  <input
                    type="password"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    required
                    placeholder="Enter Exchange API Secret Key"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {selectedExchange === 'bitget' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Passphrase</label>
                    <input
                      type="password"
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      required
                      placeholder="Enter API Key Passphrase"
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Trading Pair / Symbol <span className="text-gray-400 text-xs">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={syncSymbol}
                    onChange={(e) => setSyncSymbol(e.target.value)}
                    placeholder="e.g. BTCUSDT (Leave blank to query defaults)"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm text-blue-200">
                <h4 className="font-semibold mb-1">🛠️ API Configuration Instructions:</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>API keys must have <strong>Read-Only</strong> permissions enabled.</li>
                  <li>Do <strong>NOT</strong> enable withdrawals or trading permissions for security.</li>
                  <li>To test without exchange accounts, type <code className="bg-slate-800 px-1 py-0.5 rounded text-white">DEMO</code> inside the credentials fields to fetch mock sandbox data.</li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={syncing}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-gray-500 text-white font-bold rounded-lg transition"
              >
                {syncing ? 'Syncing Trading Accounts...' : 'Link & Sync Exchange'}
              </button>
            </form>

            {/* Sync Console Logs */}
            {(syncing || syncLogs.length > 0) && (
              <div className="mt-8">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Sync Status Log:</h3>
                <div className="bg-black/40 border border-slate-800 rounded p-4 font-mono text-xs text-green-400 h-32 overflow-y-auto space-y-1">
                  {syncLogs.map((log, index) => (
                    <div key={index}>{log}</div>
                  ))}
                  {syncing && <div className="animate-pulse">Fetching exchange data packets...</div>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. MANUAL CSV IMPORT INTERFACE */}
        {importMode === 'csv' && (
          <div className="max-w-6xl mx-auto bg-slate-900 border border-slate-800 rounded-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Manual CSV Import Wizard</h2>
              <button 
                onClick={() => {
                  setImportMode('select')
                  setStep('upload')
                  setError('')
                  setSuccess('')
                }}
                className="text-gray-400 hover:text-white transition text-sm"
              >
                &larr; Back to Selection
              </button>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-500/20 border border-green-500 text-green-200 px-4 py-3 rounded mb-6">
                {success}
              </div>
            )}

            {/* Step Indicators */}
            <div className="flex justify-center mb-8">
              <div className="flex items-center gap-4 text-sm">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${step === 'upload' ? 'bg-purple-600' : 'bg-slate-800 text-gray-400'}`}>1</div>
                <div className="h-0.5 w-10 bg-slate-800"></div>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${step === 'mapping' ? 'bg-purple-600' : 'bg-slate-800 text-gray-400'}`}>2</div>
                <div className="h-0.5 w-10 bg-slate-800"></div>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${step === 'preview' ? 'bg-purple-600' : 'bg-slate-800 text-gray-400'}`}>3</div>
                <div className="h-0.5 w-10 bg-slate-800"></div>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${step === 'complete' ? 'bg-purple-600' : 'bg-slate-800 text-gray-400'}`}>4</div>
              </div>
            </div>

            {/* CSV STEP 1: UPLOAD FILE */}
            {step === 'upload' && (
              <div className="max-w-2xl mx-auto text-center">
                <div className="mb-8 p-8 bg-slate-800 border-2 border-dashed border-slate-700 rounded-lg hover:border-purple-500 transition duration-300">
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
                      Click to upload CSV trade log file
                    </p>
                    <p className="text-gray-400 text-sm mb-4">
                      Accepts files from Binance, Bitget, or custom layouts
                    </p>
                    <span className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium transition">
                      Browse Files
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* CSV STEP 2: COLUMN MAPPING CONFIG */}
            {step === 'mapping' && (
              <div className="max-w-3xl mx-auto bg-slate-800 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-2">Configure CSV Column Mapping</h3>
                <p className="text-gray-400 text-sm mb-6">
                  Map the columns found in your file to the corresponding TradeZilla fields below.
                </p>

                <div className="space-y-4 mb-8">
                  {Object.keys(mappedFields).map((fieldKey) => {
                    const key = fieldKey as keyof MappedFields
                    const label = key.toUpperCase().replace('_', ' ')
                    const isRequired = key !== 'notes'

                    return (
                      <div key={key} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        <label className="text-sm font-semibold text-gray-300">
                          {label} {isRequired && <span className="text-red-500">*</span>}
                        </label>
                        <select
                          value={mappedFields[key]}
                          onChange={(e) => handleMappingChange(key, e.target.value)}
                          className="col-span-2 px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-purple-500"
                        >
                          <option value="">-- Select CSV Column --</option>
                          {csvHeaders.map((header) => (
                            <option key={header} value={header}>{header}</option>
                          ))}
                        </select>
                      </div>
                    )
                  })}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep('upload')}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded transition"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      // Validate if required fields mapped
                      const requiredFieldsMapped = 
                        mappedFields.symbol && 
                        mappedFields.entry_price && 
                        mappedFields.exit_price && 
                        mappedFields.quantity && 
                        mappedFields.entry_date && 
                        mappedFields.exit_date

                      if (requiredFieldsMapped) {
                        setStep('preview')
                      } else {
                        setError('Please map all required fields marked with an asterisk (*).')
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded transition"
                  >
                    Proceed to Preview
                  </button>
                </div>
              </div>
            )}

            {/* CSV STEP 3: PREVIEW & INLINE CELL VALIDATIONS */}
            {step === 'preview' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold">
                    Validate Trades Preview ({parsedTrades.length} entries parsed)
                  </h3>
                  <button 
                    onClick={() => setStep('mapping')}
                    className="text-purple-400 hover:text-purple-300 text-sm font-medium transition"
                  >
                    Adjust Mappings
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-800 rounded-lg mb-6">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800 border-b border-slate-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-gray-300">Status</th>
                        <th className="px-4 py-3 text-left text-gray-300">Symbol</th>
                        <th className="px-4 py-3 text-left text-gray-300">Entry Price</th>
                        <th className="px-4 py-3 text-left text-gray-300">Exit Price</th>
                        <th className="px-4 py-3 text-left text-gray-300">Qty</th>
                        <th className="px-4 py-3 text-left text-gray-300">Entry Date</th>
                        <th className="px-4 py-3 text-left text-gray-300">Exit Date</th>
                        <th className="px-4 py-3 text-left text-gray-300">P&L</th>
                        <th className="px-4 py-3 text-left text-gray-300">Validation Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {parsedTrades.map((trade, idx) => (
                        <tr 
                          key={idx} 
                          className={`hover:bg-slate-800/50 transition ${
                            trade.isValid ? '' : 'bg-red-500/5'
                          }`}
                        >
                          <td className="px-4 py-3">
                            {trade.isValid ? (
                              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-semibold rounded">
                                Valid
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-semibold rounded">
                                Error
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-white font-medium">
                            {trade.symbol || <span className="text-red-500">Missing</span>}
                          </td>
                          <td className={`px-4 py-3 ${isNaN(trade.entry_price) ? 'text-red-400 font-bold bg-red-500/10' : 'text-gray-300'}`}>
                            {isNaN(trade.entry_price) ? 'Invalid' : `$${trade.entry_price.toFixed(4)}`}
                          </td>
                          <td className={`px-4 py-3 ${isNaN(trade.exit_price) ? 'text-red-400 font-bold bg-red-500/10' : 'text-gray-300'}`}>
                            {isNaN(trade.exit_price) ? 'Invalid' : `$${trade.exit_price.toFixed(4)}`}
                          </td>
                          <td className={`px-4 py-3 ${isNaN(trade.quantity) ? 'text-red-400 font-bold bg-red-500/10' : 'text-gray-300'}`}>
                            {isNaN(trade.quantity) ? 'Invalid' : trade.quantity}
                          </td>
                          <td className={`px-4 py-3 ${!trade.entry_date ? 'text-red-400 bg-red-500/10' : 'text-gray-300'}`}>
                            {trade.entry_date || 'Invalid'}
                          </td>
                          <td className={`px-4 py-3 ${!trade.exit_date ? 'text-red-400 bg-red-500/10' : 'text-gray-300'}`}>
                            {trade.exit_date || 'Invalid'}
                          </td>
                          <td className={`px-4 py-3 font-medium ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {isNaN(trade.pnl) ? '--' : `$${trade.pnl.toFixed(2)}`}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {trade.isValid ? (
                              <span className="text-gray-400 font-sans">{trade.notes || 'No notes'}</span>
                            ) : (
                              <div className="text-red-400 space-y-0.5 font-semibold">
                                {trade.errors.map((err, errIdx) => (
                                  <div key={errIdx}>• {err}</div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setStep('mapping')
                      setError('')
                    }}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded transition"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleImportCSV}
                    disabled={importing}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-800 disabled:text-gray-500 text-white font-bold rounded transition"
                  >
                    {importing ? 'Importing Trades...' : `Import Mapped Trades (${parsedTrades.filter(t => t.isValid).length} Valid)`}
                  </button>
                </div>
              </div>
            )}

            {/* CSV STEP 4: COMPLETE SCREEN */}
            {step === 'complete' && (
              <div className="max-w-md mx-auto text-center py-12">
                <div className="text-7xl mb-6">🎉</div>
                <h3 className="text-3xl font-bold mb-2">Import Successful!</h3>
                <p className="text-gray-400 mb-8">{success}</p>

                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition"
                  >
                    Go to Dashboard
                  </button>
                  <button
                    onClick={() => {
                      setStep('upload')
                      setCsvHeaders([])
                      setRawCsvRows([])
                      setParsedTrades([])
                      setSuccess('')
                    }}
                    className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded font-medium transition"
                  >
                    Import More
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

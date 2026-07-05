import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabase } from '@/lib/supabase'

interface SyncRequest {
  exchange: 'binance' | 'bitget'
  apiKey: string
  apiSecret: string
  passphrase?: string // For Bitget
  symbol?: string     // Optional filter
}

export async function POST(request: NextRequest) {
  try {
    // 1. Get the current user from auth header to verify they are logged in
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized. Auth header missing.' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Invalid session.' }, { status: 401 })
    }

    // 2. Parse request body
    const body = await request.json() as SyncRequest
    const { exchange, apiKey, apiSecret, passphrase, symbol } = body

    if (!exchange || !apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Missing required parameters: exchange, apiKey, and apiSecret are required.' }, { status: 400 })
    }

    // 3. Check for Sandbox/Demo credentials
    const isDemo = apiKey.toUpperCase().includes('DEMO') || apiSecret.toUpperCase().includes('DEMO') || apiKey.toLowerCase() === 'sandbox'

    if (isDemo) {
      // Return mock data for verification/demo purposes
      const mockTrades = generateMockExchangeTrades(user.id, exchange, symbol)

      // Save mock trades to database
      const { data: insertedTrades, error: dbError } = await supabase
        .from('trades')
        .insert(mockTrades)
        .select()

      if (dbError) throw dbError

      return NextResponse.json({
        success: true,
        message: `Successfully synced ${insertedTrades.length} trades from ${exchange.toUpperCase()} (Demo Mode)`,
        tradesSynced: insertedTrades.length,
        trades: insertedTrades
      })
    }

    // 4. Connect to real exchange APIs
    let syncedTrades: any[] = []

    if (exchange === 'binance') {
      syncedTrades = await fetchBinanceTrades(apiKey, apiSecret, user.id, symbol)
    } else if (exchange === 'bitget') {
      if (!passphrase) {
        return NextResponse.json({ error: 'Passphrase is required for Bitget authentication.' }, { status: 400 })
      }
      syncedTrades = await fetchBitgetTrades(apiKey, apiSecret, passphrase, user.id, symbol)
    }

    if (syncedTrades.length === 0) {
      return NextResponse.json({
        success: true,
        message: `Sync complete. No new trades found on ${exchange.toUpperCase()}.`,
        tradesSynced: 0,
        trades: []
      })
    }

    // Save real synced trades to database
    const { data: insertedTrades, error: dbError } = await supabase
      .from('trades')
      .insert(syncedTrades)
      .select()

    if (dbError) throw dbError

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${insertedTrades.length} trades from ${exchange.toUpperCase()}!`,
      tradesSynced: insertedTrades.length,
      trades: insertedTrades
    })

  } catch (error: any) {
    console.error('API Sync Error:', error)
    return NextResponse.json({
      error: error.message || 'An error occurred during platform sync.'
    }, { status: 500 })
  }
}

// ----------------------------------------------------
// Real Binance API Integration Helper
// ----------------------------------------------------
async function fetchBinanceTrades(apiKey: string, apiSecret: string, userId: string, targetSymbol?: string): Promise<any[]> {
  const baseUrl = 'https://api.binance.com'
  const timestamp = Date.now()

  // Binance requires querying per symbol for trade history.
  // We will check the user's target symbol, or fallback to a list of major trading pairs.
  const symbolsToQuery = targetSymbol
    ? [targetSymbol.toUpperCase()]
    : ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT']

  const allTrades: any[] = []

  for (const symbol of symbolsToQuery) {
    try {
      const queryStr = `symbol=${symbol}&timestamp=${timestamp}`
      const signature = crypto
        .createHmac('sha256', apiSecret)
        .update(queryStr)
        .digest('hex')

      const url = `${baseUrl}/api/v3/myTrades?${queryStr}&signature=${signature}`

      const res = await fetch(url, {
        headers: {
          'X-MBX-APIKEY': apiKey,
          'Content-Type': 'application/json'
        }
      })

      if (!res.ok) {
        // Log error and continue to other symbols
        console.error(`Binance Symbol ${symbol} query failed:`, await res.text())
        continue
      }

      const binanceTrades = await res.json() as any[]

      // Convert Binance trades to our DB schema
      // Since Binance returns fills (buy or sell executed trades), we group/match buy and sell transactions
      // into single completed "trades" (entry/exit price and quantity)
      const mapped = convertBinanceFillsToTrades(binanceTrades, symbol, userId)
      allTrades.push(...mapped)
    } catch (err) {
      console.error(`Error querying Binance symbol ${symbol}:`, err)
    }
  }

  return allTrades
}

// Helper to group Binance buy/sell fills into completed journal records
function convertBinanceFillsToTrades(fills: any[], symbol: string, userId: string): any[] {
  if (fills.length < 2) return []

  // Sort by time ascending
  fills.sort((a, b) => a.time - b.time)

  const trades: any[] = []
  let currentOpenBuy: any = null
  let currentOpenSell: any = null

  for (const fill of fills) {
    const isBuyer = fill.isBuyer // true = Buy, false = Sell
    const price = parseFloat(fill.price)
    const qty = parseFloat(fill.qty)
    const time = new Date(fill.time).toISOString().split('T')[0]

    if (isBuyer) {
      if (currentOpenSell) {
        // We sold before, and now we bought back (Short trade completed)
        const exitPrice = currentOpenSell.price
        const entryPrice = price
        const quantity = Math.min(qty, currentOpenSell.qty)
        const pnl = (exitPrice - entryPrice) * quantity

        trades.push({
          user_id: userId,
          symbol,
          entry_price: entryPrice,
          exit_price: exitPrice,
          quantity,
          entry_date: time,
          exit_date: currentOpenSell.date,
          pnl,
          pnl_percent: ((exitPrice - entryPrice) / entryPrice) * 100,
          notes: `Binance Short trade synced via API. Trade ID: ${fill.id}`
        })
        currentOpenSell = null
      } else {
        currentOpenBuy = { price, qty, date: time }
      }
    } else {
      if (currentOpenBuy) {
        // We bought before, and now we sold (Long trade completed)
        const entryPrice = currentOpenBuy.price
        const exitPrice = price
        const quantity = Math.min(qty, currentOpenBuy.qty)
        const pnl = (exitPrice - entryPrice) * quantity

        trades.push({
          user_id: userId,
          symbol,
          entry_price: entryPrice,
          exit_price: exitPrice,
          quantity,
          entry_date: currentOpenBuy.date,
          exit_date: time,
          pnl,
          pnl_percent: ((exitPrice - entryPrice) / entryPrice) * 100,
          notes: `Binance Long trade synced via API. Trade ID: ${fill.id}`
        })
        currentOpenBuy = null
      } else {
        currentOpenSell = { price, qty, date: time }
      }
    }
  }

  return trades
}

// ----------------------------------------------------
// Real Bitget API Integration Helper
// ----------------------------------------------------
async function fetchBitgetTrades(apiKey: string, apiSecret: string, passphrase: string, userId: string, targetSymbol?: string): Promise<any[]> {
  const baseUrl = 'https://api.bitget.com'
  const timestamp = Date.now().toString()
  const requestPath = '/api/v2/spot/trade/fills'
  const method = 'GET'

  // Bitget spot trade fills can query multiple records.
  const symbolQuery = targetSymbol ? `symbol=${targetSymbol.toUpperCase()}` : ''
  const limitQuery = 'limit=50'
  const queryString = symbolQuery ? `?${symbolQuery}&${limitQuery}` : `?${limitQuery}`

  // Construct signature
  const prehash = timestamp + method + requestPath + queryString
  const accessSign = crypto
    .createHmac('sha256', apiSecret)
    .update(prehash)
    .digest('base64')

  const url = `${baseUrl}${requestPath}${queryString}`

  const res = await fetch(url, {
    headers: {
      'ACCESS-KEY': apiKey,
      'ACCESS-SIGN': accessSign,
      'ACCESS-TIMESTAMP': timestamp,
      'ACCESS-PASSPHRASE': passphrase,
      'Content-Type': 'application/json',
      'locale': 'en-US'
    }
  })

  if (!res.ok) {
    throw new Error(`Bitget API request failed: ${await res.text()}`)
  }

  const responseJson = await res.json()
  const fills = responseJson.data || []

  // Bitget maps fills directly. Group them by symbol and complete trades.
  const tradesBySymbol: { [key: string]: any[] } = {}

  for (const fill of fills) {
    const sym = fill.symbol
    if (!tradesBySymbol[sym]) tradesBySymbol[sym] = []
    tradesBySymbol[sym].push(fill)
  }

  const allTrades: any[] = []

  for (const sym in tradesBySymbol) {
    const symFills = tradesBySymbol[sym]
    // Map Bitget fills to trades
    const mapped = convertBitgetFillsToTrades(symFills, sym, userId)
    allTrades.push(...mapped)
  }

  return allTrades
}

function convertBitgetFillsToTrades(fills: any[], symbol: string, userId: string): any[] {
  if (fills.length < 2) return []

  // Sort by time ascending
  fills.sort((a, b) => parseInt(a.cTime) - parseInt(b.cTime))

  const trades: any[] = []
  let currentOpenBuy: any = null
  let currentOpenSell: any = null

  for (const fill of fills) {
    const side = fill.side // buy or sell
    const price = parseFloat(fill.price)
    const qty = parseFloat(fill.size)
    const time = new Date(parseInt(fill.cTime)).toISOString().split('T')[0]

    if (side === 'buy') {
      if (currentOpenSell) {
        const exitPrice = currentOpenSell.price
        const entryPrice = price
        const quantity = Math.min(qty, currentOpenSell.qty)
        const pnl = (exitPrice - entryPrice) * quantity

        trades.push({
          user_id: userId,
          symbol: symbol.toUpperCase(),
          entry_price: entryPrice,
          exit_price: exitPrice,
          quantity,
          entry_date: time,
          exit_date: currentOpenSell.date,
          pnl,
          pnl_percent: ((exitPrice - entryPrice) / entryPrice) * 100,
          notes: `Bitget Short trade synced via API. Fill ID: ${fill.fillId}`
        })
        currentOpenSell = null
      } else {
        currentOpenBuy = { price, qty, date: time }
      }
    } else {
      if (currentOpenBuy) {
        const entryPrice = currentOpenBuy.price
        const exitPrice = price
        const quantity = Math.min(qty, currentOpenBuy.qty)
        const pnl = (exitPrice - entryPrice) * quantity

        trades.push({
          user_id: userId,
          symbol: symbol.toUpperCase(),
          entry_price: entryPrice,
          exit_price: exitPrice,
          quantity,
          entry_date: currentOpenBuy.date,
          exit_date: time,
          pnl,
          pnl_percent: ((exitPrice - entryPrice) / entryPrice) * 100,
          notes: `Bitget Long trade synced via API. Fill ID: ${fill.fillId}`
        })
        currentOpenBuy = null
      } else {
        currentOpenSell = { price, qty, date: time }
      }
    }
  }

  return trades
}

// ----------------------------------------------------
// Mock Sync Trades Generator for Sandbox/Verification
// ----------------------------------------------------
function generateMockExchangeTrades(userId: string, exchange: string, filterSymbol?: string): any[] {
  const availableSymbols = filterSymbol
    ? [filterSymbol.toUpperCase()]
    : ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'AVAXUSDT', 'ADAUSDT']

  const mockNotes = `Synced directly from ${exchange.toUpperCase()} Sandbox API`
  const mockTrades: any[] = []

  // Generate 4-7 mock trades
  const count = Math.floor(Math.random() * 4) + 4
  const today = new Date()

  for (let i = 0; i < count; i++) {
    const symbol = availableSymbols[i % availableSymbols.length]

    // Calculate randomized entry/exit details
    let entryPrice = 0
    let pctChange = (Math.random() * 10 - 4.5) / 100 // -4.5% to +5.5% PnL

    if (symbol.startsWith('BTC')) entryPrice = 65000 + Math.random() * 3000
    else if (symbol.startsWith('ETH')) entryPrice = 3300 + Math.random() * 200
    else if (symbol.startsWith('SOL')) entryPrice = 145 + Math.random() * 15
    else entryPrice = 1.2 + Math.random() * 0.5

    const exitPrice = entryPrice * (1 + pctChange)
    const quantity = symbol.startsWith('BTC') ? 0.05 + Math.random() * 0.1 : 0.5 + Math.random() * 30

    // Create random trade dates within past 15 days
    const daysOffset = 15 - i * 2
    const entryDateObj = new Date(today)
    entryDateObj.setDate(today.getDate() - daysOffset)

    const exitDateObj = new Date(entryDateObj)
    exitDateObj.setDate(entryDateObj.getDate() + Math.floor(Math.random() * 3) + 1)

    const entry_date = entryDateObj.toISOString().split('T')[0]
    const exit_date = exitDateObj.toISOString().split('T')[0]

    const pnl = (exitPrice - entryPrice) * quantity
    const pnl_percent = pctChange * 100

    mockTrades.push({
      user_id: userId,
      symbol,
      entry_price: parseFloat(entryPrice.toFixed(4)),
      exit_price: parseFloat(exitPrice.toFixed(4)),
      quantity: parseFloat(quantity.toFixed(4)),
      entry_date,
      exit_date,
      pnl: parseFloat(pnl.toFixed(2)),
      pnl_percent: parseFloat(pnl_percent.toFixed(2)),
      notes: `${mockNotes}. (Order ID: ${Math.floor(Math.random() * 10000000)})`
    })
  }

  return mockTrades
}

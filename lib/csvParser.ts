'use client'

import { useState } from 'react'
import Papa from 'papaparse'

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

interface CSVRow {
  [key: string]: string | number
}

export const parseCSV = (file: File): Promise<ParsedTrade[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        try {
          const trades: ParsedTrade[] = results.data
            .map((row: CSVRow) => {
              // Binance format detection
              const isBinance = row['Symbol'] || row['symbol']
              const isBitget = row['Pair'] || row['pair']

              if (isBinance) {
                return parseBinanceRow(row)
              } else if (isBitget) {
                return parseBitgetRow(row)
              } else {
                // Generic format
                return parseGenericRow(row)
              }
            })
            .filter((trade: any) => trade !== null)

          resolve(trades)
        } catch (error) {
          reject(error)
        }
      },
      error: (error: any) => {
        reject(error)
      },
    })
  })
}

const parseBinanceRow = (row: CSVRow): ParsedTrade | null => {
  try {
    const symbol = String(row['Symbol'] || row['symbol'] || '').toUpperCase()
    const entryPrice = parseFloat(String(row['Entry Price'] || row['entry_price'] || 0))
    const exitPrice = parseFloat(String(row['Exit Price'] || row['exit_price'] || 0))
    const quantity = parseFloat(String(row['Qty'] || row['qty'] || 0))
    const entryDate = String(row['Entry Date'] || row['entry_date'] || '')
    const exitDate = String(row['Exit Date'] || row['exit_date'] || '')

    if (!symbol || !entryPrice || !exitPrice || !quantity) {
      return null
    }

    const pnl = (exitPrice - entryPrice) * quantity
    const pnl_percent = ((exitPrice - entryPrice) / entryPrice) * 100

    return {
      symbol,
      entry_price: entryPrice,
      exit_price: exitPrice,
      quantity,
      entry_date: formatDate(entryDate),
      exit_date: formatDate(exitDate),
      notes: String(row['Notes'] || row['notes'] || ''),
      pnl,
      pnl_percent,
    }
  } catch (error) {
    console.error('Error parsing Binance row:', error)
    return null
  }
}

const parseBitgetRow = (row: CSVRow): ParsedTrade | null => {
  try {
    const symbol = String(row['Pair'] || row['pair'] || '').toUpperCase()
    const entryPrice = parseFloat(String(row['Entry Price'] || row['entry_price'] || 0))
    const exitPrice = parseFloat(String(row['Exit Price'] || row['exit_price'] || 0))
    const quantity = parseFloat(String(row['Amount'] || row['amount'] || 0))
    const entryDate = String(row['Entry Time'] || row['entry_time'] || '')
    const exitDate = String(row['Exit Time'] || row['exit_time'] || '')

    if (!symbol || !entryPrice || !exitPrice || !quantity) {
      return null
    }

    const pnl = (exitPrice - entryPrice) * quantity
    const pnl_percent = ((exitPrice - entryPrice) / entryPrice) * 100

    return {
      symbol,
      entry_price: entryPrice,
      exit_price: exitPrice,
      quantity,
      entry_date: formatDate(entryDate),
      exit_date: formatDate(exitDate),
      notes: String(row['Notes'] || row['notes'] || ''),
      pnl,
      pnl_percent,
    }
  } catch (error) {
    console.error('Error parsing Bitget row:', error)
    return null
  }
}

const parseGenericRow = (row: CSVRow): ParsedTrade | null => {
  try {
    const symbol = String(
      row['Symbol'] ||
        row['symbol'] ||
        row['Pair'] ||
        row['pair'] ||
        ''
    ).toUpperCase()
    const entryPrice = parseFloat(
      String(row['Entry Price'] || row['entry_price'] || row['EntryPrice'] || 0)
    )
    const exitPrice = parseFloat(
      String(row['Exit Price'] || row['exit_price'] || row['ExitPrice'] || 0)
    )
    const quantity = parseFloat(
      String(row['Quantity'] || row['quantity'] || row['Qty'] || row['qty'] || row['Amount'] || 0)
    )
    const entryDate = String(
      row['Entry Date'] ||
        row['entry_date'] ||
        row['EntryDate'] ||
        row['Entry Time'] ||
        ''
    )
    const exitDate = String(
      row['Exit Date'] || row['exit_date'] || row['ExitDate'] || row['Exit Time'] || ''
    )

    if (!symbol || !entryPrice || !exitPrice || !quantity) {
      return null
    }

    const pnl = (exitPrice - entryPrice) * quantity
    const pnl_percent = ((exitPrice - entryPrice) / entryPrice) * 100

    return {
      symbol,
      entry_price: entryPrice,
      exit_price: exitPrice,
      quantity,
      entry_date: formatDate(entryDate),
      exit_date: formatDate(exitDate),
      notes: String(row['Notes'] || row['notes'] || ''),
      pnl,
      pnl_percent,
    }
  } catch (error) {
    console.error('Error parsing generic row:', error)
    return null
  }
}

const formatDate = (dateStr: string): string => {
  if (!dateStr) return new Date().toISOString().split('T')[0]

  try {
    // Try parsing various date formats
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return new Date().toISOString().split('T')[0]
    }
    return date.toISOString().split('T')[0]
  } catch {
    return new Date().toISOString().split('T')[0]
  }
}

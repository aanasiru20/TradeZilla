export const exportToCSV = (trades: any[], filename = 'trades.csv') => {
  if (trades.length === 0) {
    alert('No trades to export')
    return
  }

  // Define CSV headers
  const headers = [
    'Symbol',
    'Entry Price',
    'Exit Price',
    'Quantity',
    'Entry Date',
    'Exit Date',
    'P&L',
    'P&L %',
    'Notes',
  ]

  // Create CSV rows
  const rows = trades.map((trade) => [
    trade.symbol,
    trade.entry_price.toFixed(2),
    trade.exit_price.toFixed(2),
    trade.quantity.toFixed(2),
    new Date(trade.entry_date).toLocaleDateString(),
    new Date(trade.exit_date).toLocaleDateString(),
    trade.pnl.toFixed(2),
    trade.pnl_percent.toFixed(2),
    `"${(trade.notes || '').replace(/"/g, '""')}"`, // Escape quotes in notes
  ])

  // Combine headers and rows
  const csv = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n')

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

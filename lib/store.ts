import { create } from 'zustand'

interface Trade {
  id: string
  symbol: string
  entry_price: number
  exit_price: number
  quantity: number
  entry_date: string
  exit_date: string
  pnl: number
  pnl_percent: number
  notes: string
}

interface TradeStore {
  trades: Trade[]
  selectedTrade: Trade | null
  setTrades: (trades: Trade[]) => void
  addTrade: (trade: Trade) => void
  updateTrade: (trade: Trade) => void
  removeTrade: (id: string) => void
  setSelectedTrade: (trade: Trade | null) => void
}

export const useTradeStore = create<TradeStore>((set) => ({
  trades: [],
  selectedTrade: null,
  setTrades: (trades) => set({ trades }),
  addTrade: (trade) => set((state) => ({ trades: [...state.trades, trade] })),
  updateTrade: (updatedTrade) =>
    set((state) => ({
      trades: state.trades.map((t) =>
        t.id === updatedTrade.id ? updatedTrade : t
      ),
    })),
  removeTrade: (id) =>
    set((state) => ({
      trades: state.trades.filter((t) => t.id !== id),
    })),
  setSelectedTrade: (trade) => set({ selectedTrade: trade }),
}))

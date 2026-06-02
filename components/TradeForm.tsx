'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase'
import { useTradeStore } from '@/lib/store'
import { TradeFormSchema, TradeFormData } from '@/lib/schemas'

interface TradeFormProps {
  onSuccess?: () => void
}

export default function TradeForm({ onSuccess }: TradeFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { addTrade } = useTradeStore()
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TradeFormData>({
    resolver: zodResolver(TradeFormSchema),
  })

  const onSubmit = async (data: TradeFormData) => {
    setIsLoading(true)
    setError('')
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      
      if (!user) throw new Error('Not authenticated')

      // Calculate P&L
      const pnl = (data.exit_price - data.entry_price) * data.quantity
      const pnl_percent = ((data.exit_price - data.entry_price) / data.entry_price) * 100

      const { data: trade, error: insertError } = await supabase
        .from('trades')
        .insert([
          {
            user_id: user.id,
            symbol: data.symbol,
            entry_price: data.entry_price,
            exit_price: data.exit_price,
            quantity: data.quantity,
            entry_date: data.entry_date,
            exit_date: data.exit_date,
            pnl,
            pnl_percent,
            notes: data.notes,
          },
        ])
        .select()

      if (insertError) throw insertError

      // Update store
      if (trade && trade[0]) {
        addTrade(trade[0])
      }

      reset()
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create trade')
      console.error('Error creating trade:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Symbol</label>
        <input
          {...register('symbol')}
          placeholder="AAPL"
          className="w-full px-3 py-2 bg-slate-800 rounded border border-slate-700 text-white"
        />
        {errors.symbol && (
          <p className="text-red-500 text-sm mt-1">{errors.symbol.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Entry Price</label>
          <input
            {...register('entry_price', { valueAsNumber: true })}
            type="number"
            step="0.01"
            placeholder="100.00"
            className="w-full px-3 py-2 bg-slate-800 rounded border border-slate-700 text-white"
          />
          {errors.entry_price && (
            <p className="text-red-500 text-sm mt-1">
              {errors.entry_price.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Exit Price</label>
          <input
            {...register('exit_price', { valueAsNumber: true })}
            type="number"
            step="0.01"
            placeholder="105.00"
            className="w-full px-3 py-2 bg-slate-800 rounded border border-slate-700 text-white"
          />
          {errors.exit_price && (
            <p className="text-red-500 text-sm mt-1">
              {errors.exit_price.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Quantity</label>
          <input
            {...register('quantity', { valueAsNumber: true })}
            type="number"
            step="0.1"
            placeholder="10"
            className="w-full px-3 py-2 bg-slate-800 rounded border border-slate-700 text-white"
          />
          {errors.quantity && (
            <p className="text-red-500 text-sm mt-1">{errors.quantity.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Entry Date</label>
          <input
            {...register('entry_date')}
            type="date"
            className="w-full px-3 py-2 bg-slate-800 rounded border border-slate-700 text-white"
          />
          {errors.entry_date && (
            <p className="text-red-500 text-sm mt-1">
              {errors.entry_date.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Exit Date</label>
        <input
          {...register('exit_date')}
          type="date"
          className="w-full px-3 py-2 bg-slate-800 rounded border border-slate-700 text-white"
        />
        {errors.exit_date && (
          <p className="text-red-500 text-sm mt-1">{errors.exit_date.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Notes</label>
        <textarea
          {...register('notes')}
          placeholder="Trade notes..."
          rows={3}
          className="w-full px-3 py-2 bg-slate-800 rounded border border-slate-700 text-white"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded font-medium transition"
      >
        {isLoading ? 'Submitting...' : 'Add Trade'}
      </button>
    </form>
  )
}

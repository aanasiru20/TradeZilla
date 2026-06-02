'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase'
import { useTradeStore } from '@/lib/store'
import { TradeFormSchema, TradeFormData } from '@/lib/schemas'

interface TradeModalProps {
  trade?: any
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function TradeModal({
  trade,
  isOpen,
  onClose,
  onSuccess,
}: TradeModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { updateTrade } = useTradeStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<TradeFormData>({
    resolver: zodResolver(TradeFormSchema),
    defaultValues: trade
      ? {
          symbol: trade.symbol,
          entry_price: trade.entry_price,
          exit_price: trade.exit_price,
          quantity: trade.quantity,
          entry_date: trade.entry_date,
          exit_date: trade.exit_date,
          notes: trade.notes || '',
        }
      : undefined,
  })

  const onSubmit = async (data: TradeFormData) => {
    setIsLoading(true)
    setError('')
    try {
      if (!trade?.id) throw new Error('Trade ID missing')

      // Calculate P&L
      const pnl = (data.exit_price - data.entry_price) * data.quantity
      const pnl_percent =
        ((data.exit_price - data.entry_price) / data.entry_price) * 100

      const { data: updated, error: updateError } = await supabase
        .from('trades')
        .update({
          symbol: data.symbol,
          entry_price: data.entry_price,
          exit_price: data.exit_price,
          quantity: data.quantity,
          entry_date: data.entry_date,
          exit_date: data.exit_date,
          pnl,
          pnl_percent,
          notes: data.notes,
        })
        .eq('id', trade.id)
        .select()

      if (updateError) throw updateError

      // Update store
      if (updated && updated[0]) {
        updateTrade(updated[0])
      }

      reset()
      onClose()
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update trade')
      console.error('Error updating trade:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-white mb-4">Edit Trade</h2>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Symbol
            </label>
            <input
              {...register('symbol')}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
            {errors.symbol && (
              <p className="text-red-500 text-sm mt-1">{errors.symbol.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Entry Price
              </label>
              <input
                {...register('entry_price', { valueAsNumber: true })}
                type="number"
                step="0.01"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
              />
              {errors.entry_price && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.entry_price.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Exit Price
              </label>
              <input
                {...register('exit_price', { valueAsNumber: true })}
                type="number"
                step="0.01"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
              />
              {errors.exit_price && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.exit_price.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Quantity
              </label>
              <input
                {...register('quantity', { valueAsNumber: true })}
                type="number"
                step="0.1"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
              />
              {errors.quantity && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.quantity.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Entry Date
              </label>
              <input
                {...register('entry_date')}
                type="date"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
              />
              {errors.entry_date && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.entry_date.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Exit Date
            </label>
            <input
              {...register('exit_date')}
              type="date"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
            />
            {errors.exit_date && (
              <p className="text-red-500 text-sm mt-1">
                {errors.exit_date.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              {...register('notes')}
              rows={2}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded transition"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

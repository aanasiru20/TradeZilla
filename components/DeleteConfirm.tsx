'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTradeStore } from '@/lib/store'

interface DeleteConfirmProps {
  tradeId: string
  tradeSymbol: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function DeleteConfirm({
  tradeId,
  tradeSymbol,
  isOpen,
  onClose,
  onSuccess,
}: DeleteConfirmProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { removeTrade } = useTradeStore()

  const handleDelete = async () => {
    setIsLoading(true)
    setError('')

    try {
      const { error: deleteError } = await supabase
        .from('trades')
        .delete()
        .eq('id', tradeId)

      if (deleteError) throw deleteError

      removeTrade(tradeId)
      onClose()
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete trade')
      console.error('Error deleting trade:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-lg p-6 max-w-sm w-full mx-4">
        <h2 className="text-xl font-bold text-white mb-2">Delete Trade?</h2>
        <p className="text-gray-400 mb-4">
          Are you sure you want to delete the <span className="font-semibold text-white">{tradeSymbol}</span> trade? This action cannot be undone.
        </p>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700 text-white rounded transition"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded transition"
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

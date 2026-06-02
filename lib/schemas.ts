'use client'

import { z } from 'zod'

export const TradeFormSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  entry_price: z.number().positive('Entry price must be positive'),
  exit_price: z.number().positive('Exit price must be positive'),
  quantity: z.number().positive('Quantity must be positive'),
  entry_date: z.string().min(1, 'Entry date is required'),
  exit_date: z.string().min(1, 'Exit date is required'),
  notes: z.string().optional(),
})

export type TradeFormData = z.infer<typeof TradeFormSchema>

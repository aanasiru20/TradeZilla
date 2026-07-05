# TradeZilla - Multi-user Trading Journal

A modern SaaS trading journal platform built with Next.js, designed for multiple users to track and analyze their trades.

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
DATABASE_URL=your_database_url
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Key Next.js Concepts vs React

### 1. **App Router (App Directory)**
- Next.js uses `app/` directory (newer approach)
- File-based routing: `app/dashboard/page.tsx` = `/dashboard`
- API routes: `app/api/trades/route.ts` = `/api/trades`

### 2. **Server Components (Default)**
```tsx
// This runs on the server
export default async function Page() {
  const data = await fetch('...')
  return <div>{data}</div>
}
```

### 3. **Client Components**
```tsx
'use client' // Mark as client component
import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
```

### 4. **API Routes** (Replace traditional backend)
```tsx
// app/api/trades/route.ts
export async function GET(request: Request) {
  return Response.json({ trades: [] })
}

export async function POST(request: Request) {
  const data = await request.json()
  return Response.json({ created: true })
}
```

## Project Structure

```
app/
├── layout.tsx           # Root layout
├── page.tsx            # Home page
├── api/                # API routes
│   ├── auth/           # Authentication endpoints
│   ├── trades/         # Trade CRUD endpoints
│   └── health/         # Health check
├── dashboard/          # Protected dashboard pages
├── auth/               # Auth pages (login, signup)
└── globals.css         # Global styles

lib/
├── supabase.ts         # Supabase client
├── store.ts            # Zustand store
└── api.ts              # API utilities

components/
├── TradeForm.tsx       # Trade entry form
├── TradeTable.tsx      # Trades display
└── Charts.tsx          # Charts and analytics
```

## Available Scripts

- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Libraries Included

- **Supabase** - Database & Auth
- **React Hook Form** - Form management
- **Zod** - Schema validation
- **TanStack Query** - Server state management
- **Zustand** - Client state
- **Recharts** - Data visualization
- **TanStack Table** - Data tables
- **Lucide Icons** - Icon library

## Key Features to Build

- [ ] User authentication (Supabase Auth)
- [ ] Trade journaling system
- [ ] Trade analytics & statistics
- [ ] CSV import/export
- [ ] Multi-user dashboard
- [ ] Role-based access control (RBAC)
- [ ] Real-time updates

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [React Hook Form](https://react-hook-form.com/)
- [TanStack Query](https://tanstack.com/query/latest)

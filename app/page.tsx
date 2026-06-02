import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-slate-950">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-2 text-white">TradeZilla</h1>
        <p className="text-xl text-gray-400 mb-12">Your Professional Trading Journal</p>
        
        <div className="flex gap-4 justify-center">
          <Link
            href="/auth/login"
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition"
          >
            Login
          </Link>
          <Link
            href="/auth/signup"
            className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded transition"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </main>
  )
}

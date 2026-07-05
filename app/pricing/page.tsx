'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';

const PaystackCheckout = dynamic(() => import('@/components/PaystackCheckout'), { ssr: false });

export default function PricingPage() {
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email && session?.user?.id) {
        setUserEmail(session.user.email);
        setUserId(session.user.id);
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white py-20 px-4">
      <div className="max-w-7xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">
          Supercharge Your Trading with <span className="text-green-500">Pro</span>
        </h1>
        <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
          Unlock advanced analytics, unlimited auto-syncs, and lifetime data retention for a single flat fee. Built for serious traders.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">

          {/* Free Tier */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col text-left">
            <h3 className="text-2xl font-bold mb-2">Basic</h3>
            <div className="text-4xl font-extrabold mb-6">₦0 <span className="text-lg text-gray-500 font-normal">/month</span></div>
            <ul className="space-y-4 mb-8 flex-1 text-gray-300">
              <li className="flex items-center gap-2"><span>✔️</span> Up to 100 manual trades</li>
              <li className="flex items-center gap-2"><span>✔️</span> Basic P&L tracking</li>
              <li className="flex items-center gap-2"><span>✔️</span> 1 Exchange connection</li>
              <li className="flex items-center gap-2 text-gray-500 line-through"><span>✖️</span> Advanced Charts</li>
            </ul>
            <button className="w-full py-3 px-6 bg-slate-800 text-gray-400 font-bold rounded-lg cursor-not-allowed">
              Current Plan
            </button>
          </div>

          {/* Pro Tier */}
          <div className="bg-slate-900 border-2 border-green-500 rounded-2xl p-8 flex flex-col text-left relative overflow-hidden transform md:-translate-y-4 shadow-2xl shadow-green-500/10">
            <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
              Most Popular
            </div>
            <h3 className="text-2xl font-bold mb-2 text-green-400">Pro Monthly</h3>
            <div className="text-4xl font-extrabold mb-6">₦0 <span className="text-lg text-gray-500 font-normal">/month</span></div>
            <ul className="space-y-4 mb-8 flex-1 text-gray-300">
              <li className="flex items-center gap-2 text-white font-medium"><span>✔️</span> Unlimited Trades & Syncs</li>
              <li className="flex items-center gap-2 text-white font-medium"><span>✔️</span> Advanced Analytics & Charts</li>
              <li className="flex items-center gap-2 text-white font-medium"><span>✔️</span> CSV Exports & Reporting</li>
              <li className="flex items-center gap-2 text-white font-medium"><span>✔️</span> Priority Support</li>
            </ul>

            {loading ? (
              <div className="w-full py-3 text-center text-gray-400">Loading...</div>
            ) : userEmail && userId ? (
              <PaystackCheckout
                email={userEmail}
                userId={userId}
                amountInNaira={0}
                planName="Pro Monthly"
              />
            ) : (
              <button
                onClick={() => window.location.href = '/auth/login'}
                className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition"
              >
                Login to Upgrade
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

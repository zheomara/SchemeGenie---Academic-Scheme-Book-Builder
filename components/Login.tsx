
"use client";

import React, { useState } from 'react';
import { Lock, Sparkles, Smartphone, Loader2 } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (response.ok) {
        onLogin();
      } else {
        setError(true);
        setTimeout(() => setError(false), 2000);
      }
    } catch (err) {
      setError(true);
      setTimeout(() => setError(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-500">
        <div className="bg-indigo-600 p-8 text-center text-white relative">
          <div className="absolute top-4 right-4 opacity-20">
            <Sparkles className="w-12 h-12" />
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight">SchemeGenie Access</h1>
          <p className="text-indigo-100 text-xs font-bold mt-2 uppercase tracking-widest">Premium Curriculum Engine</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-indigo-600">
              <Smartphone className="w-5 h-5" />
              <span className="font-black text-sm uppercase tracking-wider">Payment Required</span>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed">
              To generate schemes, please send <span className="font-black text-indigo-700">$5 USD</span> via EcoCash to:
            </p>
            <div className="bg-white py-3 px-4 rounded-xl border-2 border-dashed border-indigo-200 inline-block">
              <span className="text-xl font-black text-slate-800 tracking-tighter">0773 197 868</span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Once paid, enter your access code below</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Code</label>
              <input
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="••••"
                className={`w-full border-2 p-4 rounded-2xl text-center text-2xl font-black tracking-[0.5em] outline-none transition-all ${
                  error ? 'border-rose-500 bg-rose-50 animate-shake' : 'border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
                }`}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Unlock Engine"
              )}
            </button>
          </form>

          <p className="text-center text-[10px] text-slate-400 font-medium">
            &copy; 2026 SchemeGenie AI • All Rights Reserved
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

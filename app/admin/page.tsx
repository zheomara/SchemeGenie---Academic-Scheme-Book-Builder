"use client";

import React, { useState } from "react";
import { Key, Copy, Check, Loader2, ShieldCheck, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function AdminPortal() {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setGeneratedCode(null);

    try {
      const response = await fetch("/api/admin/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate code");
      }

      setGeneratedCode(data.code);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col p-6 font-sans">
      <header className="mb-8 flex items-center gap-4">
        <Link href="/" className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Admin Portal</h1>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Access Code Generator</p>
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-md mx-auto w-full">
        <div className="bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-700/50">
          <div className="flex justify-center mb-8">
            <div className="bg-indigo-600/20 p-4 rounded-2xl">
              <ShieldCheck className="w-10 h-10 text-indigo-500" />
            </div>
          </div>

          <form onSubmit={handleGenerate} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="pin" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
                Master PIN
              </label>
              <div className="relative">
                <input
                  id="pin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-12 text-center text-2xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:tracking-normal placeholder:text-slate-700"
                  required
                />
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !pin}
              className={cn(
                "w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-3",
                loading || !pin
                  ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 active:scale-95"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Code
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="mt-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 animate-shake">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-xs font-bold">{error}</p>
            </div>
          )}

          {generatedCode && (
            <div className="mt-8 space-y-4 animate-in fade-in zoom-in duration-500">
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Generated Access Code</p>
                <div className="bg-emerald-500/10 border-2 border-dashed border-emerald-500/30 rounded-2xl p-6 relative group">
                  <span className="text-4xl font-black tracking-widest text-emerald-400 font-mono">
                    {generatedCode}
                  </span>
                  <button
                    onClick={copyToClipboard}
                    className="absolute -right-2 -top-2 bg-slate-700 hover:bg-slate-600 p-2 rounded-xl shadow-lg transition-all active:scale-90"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-center text-slate-500 italic">
                This code is now active in the database and ready for use.
              </p>
            </div>
          )}
        </div>

        <div className="mt-12 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">
            Secure Admin Portal • v1.0
          </p>
        </div>
      </main>
    </div>
  );
}

function Sparkles(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}

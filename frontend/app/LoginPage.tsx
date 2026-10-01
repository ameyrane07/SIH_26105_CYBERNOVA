"use client";
import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, Lock, User } from 'lucide-react';

interface UserSession {
  user: string;
  role: string;
  sessionToken: string;
}

interface LoginPageProps {
  onLoginSuccess: (session: UserSession) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState<string>('board.executive@cybernova.internal');
  const [password, setPassword] = useState<string>('••••••••••••');
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);

    setTimeout(() => {
      setIsAuthenticating(false);
      onLoginSuccess({
        user: username,
        role: 'Executive Boardroom & CISO Session',
        sessionToken: 'cyb_auth_991823x9183'
      });
    }, 350);
  };

  return (
    <div className="min-h-screen w-full bg-[#070b12] flex flex-col items-center justify-center p-4 text-slate-100 font-sans">
      <div className="w-full max-w-sm bg-[#0c121e] border border-slate-800 rounded-3xl p-8 shadow-md">
        
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="text-emerald-400 shrink-0" size={32} />
          <h1 className="font-extrabold tracking-tight text-white text-xl leading-none">
            CYBERNOVA
          </h1>
        </div>

        {/* OpenFAIR Subtitle Banner */}
        <div className="pb-5 border-b border-slate-800/80 mb-6">
          <p className="text-[10px] text-slate-400 font-mono tracking-wider">
            OpenFAIR Standard • 0/1 Knapsack ROSI Optimizer
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Executive Identity
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User size={15} />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                placeholder="identity@enterprise.internal"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Access Token
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock size={15} />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={isAuthenticating}
            className="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-xs rounded-full transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-800 disabled:cursor-not-allowed"
          >
            {isAuthenticating ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Access Executive Portal</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
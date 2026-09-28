// ---------------------------------------------------------
// COMPONENTE: BARRA LATERAL DE SEGURIDAD Y MATCHMAKING P2P
// ---------------------------------------------------------
import React from 'react';
import { ShieldCheck, CheckCircle2, Repeat, ChevronRight } from 'lucide-react';

export default function SecuritySidebar({ phone, isVerified, onOpenTradeMatches, onReverifyPhone }) {
  return (
    <aside className="space-y-4">
      
      {/* 1. SEGURIDAD Y ESTADO OTP */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-4 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Phone Security</h3>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full">
            {isVerified ? 'SECURE' : 'PENDING'}
          </span>
        </div>

        <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 space-y-1">
          <span className="text-[10px] text-neutral-500 font-mono block uppercase">Registered Phone</span>
          <div className="text-sm font-bold font-mono text-neutral-200">{phone || '+57 300 234 5678'}</div>
          <span className="text-[10px] text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> {isVerified ? 'Verified via SMS/OTP' : 'OTP Verification Required'}
          </span>
        </div>

        <div className="space-y-2 text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Identity protection enabled
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Trade confirmations via SMS/OTP
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Instant dispute alerts
          </div>
        </div>

        <button 
          onClick={onReverifyPhone}
          className="w-full py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300 border border-neutral-700 transition"
        >
          Change or Re-verify Number
        </button>
      </div>

      {/* 2. MATCHMAKING P2P DIRECTO */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Repeat className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">Mutual Matchmaking</h3>
        </div>

        <div className="text-center py-2 space-y-1">
          <div className="text-lg font-black text-amber-400 font-mono">3 mutual matches found</div>
          <p className="text-[11px] text-neutral-400 leading-relaxed">
            You have cards wanted by local traders who also possess cards from your active Wishlist.
          </p>
        </div>

        <button 
          onClick={onOpenTradeMatches}
          className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-bold text-neutral-950 flex items-center justify-center gap-1 transition shadow-lg shadow-amber-500/10"
        >
          View P2P Matches <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 3. RESUMEN DE ACTIVIDAD */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-3 backdrop-blur-md">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white">Trading Activity</h3>
        
        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-neutral-800/80">
            <span className="text-neutral-400">Completed trades</span>
            <span className="font-mono font-bold text-white">42</span>
          </div>
          <div className="flex justify-between py-1 border-b border-neutral-800/80">
            <span className="text-neutral-400">Response time</span>
            <span className="font-mono font-bold text-emerald-400">~ 15 min</span>
          </div>
          <div className="flex justify-between py-1 border-b border-neutral-800/80">
            <span className="text-neutral-400">Portfolio value</span>
            <span className="font-mono font-bold text-amber-400">$3,562</span>
          </div>
        </div>
      </div>

    </aside>
  );
}
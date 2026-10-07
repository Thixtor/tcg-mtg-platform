// ============================================================================
// COMPONENTE: PESTAÑA DE GESTIÓN DE INTERCAMBIOS Y PROPUESTAS P2P
// ============================================================================
// ARQUITECTURA & REGLAS:
// - Muestra las propuestas entrantes y salientes del usuario autenticado.
// - Permite aceptar o rechazar solicitudes pendientes recibidas.
// ============================================================================

import React from 'react';
import { Users, ArrowLeftRight, Loader2 } from 'lucide-react';

export default function TradeProposalsTab({
  loading,
  proposals = [],
  currentUserId,
  onRespondProposal
}) {
  if (loading) {
    return (
      <div className="py-24 text-center text-xs font-mono text-neutral-500 flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-[#E88B00]" />
        <span>Cargando propuestas de intercambio...</span>
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="py-20 text-center border border-dashed border-[#2A2733] bg-[#131217]/50 p-8 space-y-3 font-mono text-xs rounded-2xl">
        <Users className="w-8 h-8 text-neutral-600 mx-auto" />
        <p className="text-neutral-300 font-bold uppercase">No tienes intercambios activos o pendientes.</p>
        <p className="text-neutral-500 text-[11px]">Explora el muro y propón cambios a otros coleccionistas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-mono">
      {proposals.map((prop) => {
        const isIncoming = prop.receiver_id === currentUserId;
        return (
          <article key={prop.id} className="bg-[#131217] border border-[#2A2733] p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-[#E88B00]" />
                {isIncoming 
                  ? `Propuesta recibida de @${prop.sender_username || 'Usuario'}` 
                  : `Propuesta enviada a @${prop.receiver_username || 'Usuario'}`}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                prop.status === 'ACCEPTED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500' :
                prop.status === 'REJECTED' ? 'bg-rose-950 text-rose-400 border border-rose-500' :
                'bg-amber-950 text-amber-400 border border-amber-500'
              }`}>
                {prop.status || 'PENDIENTE'}
              </span>
            </div>

            {prop.notes && (
              <p className="text-[11px] text-neutral-400 bg-[#0C0B0E] p-2.5 rounded-xl border border-[#242129]">
                "{prop.notes}"
              </p>
            )}

            {isIncoming && prop.status === 'PENDING' && (
              <div className="flex justify-end gap-2 pt-2 border-t border-[#242129]">
                <button
                  type="button"
                  onClick={() => onRespondProposal(prop.id, 'REJECTED')}
                  className="px-4 py-1.5 bg-neutral-900 hover:bg-rose-950/40 text-neutral-400 hover:text-rose-400 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Rechazar
                </button>
                <button
                  type="button"
                  onClick={() => onRespondProposal(prop.id, 'ACCEPTED')}
                  className="px-4 py-1.5 bg-[#E88B00] hover:bg-[#FF9D0A] text-black rounded-xl text-xs font-black transition cursor-pointer"
                >
                  Aceptar Intercambio
                </button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
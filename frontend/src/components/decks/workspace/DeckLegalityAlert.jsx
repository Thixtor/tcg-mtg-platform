// ---------------------------------------------------------
// COMPONENTE: ALERTA DE INFRACCIONES DE LEGALIDAD DEL MAZO
// ---------------------------------------------------------
import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function DeckLegalityAlert({ legalityReport, format, isLightMode }) {
  if (legalityReport.isLegal || !legalityReport.errors || legalityReport.errors.length === 0) {
    return null;
  }

  return (
    <div className={`p-3 rounded-xl border text-xs font-mono space-y-1 ${
      isLightMode 
        ? 'bg-amber-50 border-amber-300 text-amber-900' 
        : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
    }`}>
      <div className="flex items-center gap-1.5 font-bold">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
        <span>Infracciones de Legalidad ({format}):</span>
      </div>
      <ul className="list-disc pl-5 space-y-0.5 opacity-90 text-[11px]">
        {legalityReport.errors.slice(0, 3).map((err, i) => (
          <li key={i}>{err}</li>
        ))}
      </ul>
    </div>
  );
}
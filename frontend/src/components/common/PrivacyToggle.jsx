// ---------------------------------------------------------
// COMPONENTE: SELECTOR DE VISIBILIDAD / PRIVACIDAD REUTILIZABLE
// ---------------------------------------------------------
import React from 'react';
import { Globe, Lock } from 'lucide-react';

export default function PrivacyToggle({
  isPublic,
  onChange,
  publicLabel = "Público",
  privateLabel = "Privado",
  publicDescription = "Visible en tu perfil público para la comunidad.",
  privateDescription = "Privado. Solo tú podrás ver este recurso.",
}) {
  return (
    <div className="space-y-2 p-3.5 bg-neutral-950/80 rounded-xl border border-neutral-800/80">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-300 font-bold block">
            Visibilidad en la Comunidad
          </span>
          <span className="text-[11px] text-neutral-400">
            {isPublic ? publicDescription : privateDescription}
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-neutral-900 p-1 rounded-xl border border-neutral-800 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onChange(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              isPublic
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{publicLabel}</span>
          </button>

          <button
            type="button"
            onClick={() => onChange(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              !isPublic
                ? 'bg-neutral-800 text-white font-bold shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{privateLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
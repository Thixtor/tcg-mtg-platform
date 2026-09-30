// ---------------------------------------------------------
// COMPONENTE: BANNER / GUARD VISUAL PARA USUARIOS INVITADOS
// ---------------------------------------------------------
import React from 'react';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';

/**
 * Banner estándar presentado a visitantes anónimos en vistas protegidas.
 * @param {Object} props
 * @param {string} props.title - Título principal de la invitación
 * @param {string} props.description - Explicación contextual de la funcionalidad
 * @param {string} [props.icon] - Icono visual temático
 * @param {Function} props.onOpenAuthModal - Handler para desplegar el modal de autenticación
 */
export function GuestStateBanner({
  title = 'Inicia sesión para continuar',
  description = 'Accede a tu cuenta para desbloquear esta funcionalidad y sincronizar tu colección.',
  icon: Icon = Lock,
  onOpenAuthModal,
}) {
  return (
    <div className="w-full max-w-2xl mx-auto my-12 p-8 rounded-3xl bg-neutral-900/60 border border-neutral-800 text-center space-y-6 shadow-2xl backdrop-blur-sm">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
        <Icon className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
          {title}
        </h2>
        <p className="text-xs md:text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      </div>

      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={onOpenAuthModal}
          className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs md:text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-98"
        >
          <Sparkles className="w-4 h-4" />
          <span>Iniciar Sesión / Registrarse</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <p className="text-[11px] text-neutral-500 font-mono">
        El explorador de cartas y catálogo general permanecen 100% abiertos y sin registro.
      </p>
    </div>
  );
}

export default GuestStateBanner;
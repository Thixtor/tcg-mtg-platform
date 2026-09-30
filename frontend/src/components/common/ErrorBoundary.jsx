// ---------------------------------------------------------
// COMPONENTE: ERROR BOUNDARY GLOBAL PARA RESILIENCIA EN UI
// ---------------------------------------------------------
import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary Global]: Error no capturado en renderizado:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B0B0B] text-neutral-100 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-black tracking-tight text-white">
                Interrupción en el Hechizo
              </h1>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Ocurrió un error inesperado al renderizar este componente. Tus datos de sesión y colecciones se mantienen a salvo.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-black/50 border border-neutral-800 rounded-xl text-[11px] font-mono text-rose-400 text-left overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition shadow-md"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reintentar</span>
              </button>

              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs transition"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Ir al Inicio</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
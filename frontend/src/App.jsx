// ---------------------------------------------------------
// COMPONENTE PRINCIPAL DE LA APLICACIÓN (APP LAYOUT)
// ---------------------------------------------------------
import React from 'react';
import { CatalogPage } from './pages/CatalogPage';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100 font-sans selection:bg-amber-500 selection:text-neutral-950">
      
      {/* --------------------------------------------------------- */}
      {/* 1. BARRA DE NAVEGACIÓN SUPERIOR (NAVBAR)                  */}
      {/* --------------------------------------------------------- */}
      <header className="sticky top-0 z-40 w-full border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl select-none">🧙‍♂️</span>
            <div>
              <span className="text-base font-bold tracking-tight text-neutral-100 block leading-tight">
                MTG Trade & Market
              </span>
              <span className="text-[10px] text-amber-500 font-mono tracking-wider uppercase font-semibold">
                Analytics & P2P Exchange
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              API Online
            </div>
          </div>
        </div>
      </header>

      {/* --------------------------------------------------------- */}
      {/* 2. ÁREA DE CONTENIDO PRINCIPAL (ROUTER / VISTAS)           */}
      {/* --------------------------------------------------------- */}
      <div className="flex-1 flex flex-col">
        <CatalogPage />
      </div>

      {/* --------------------------------------------------------- */}
      {/* 3. PIE DE PÁGINA Y AVISO LEGAL DE SCRYFALL / WOTC         */}
      {/* --------------------------------------------------------- */}
      <footer className="border-t border-neutral-900 bg-neutral-950 py-6 text-center text-xs text-neutral-500 px-4">
        <div className="max-w-7xl mx-auto space-y-2">
          <p>
            Plataforma de intercambio local y consulta analítica de Magic: The Gathering.
          </p>
          <p className="text-[11px] text-neutral-600 max-w-2xl mx-auto">
            La información literal y gráfica relacionada con Magic: The Gathering es copyright de Wizards of the Coast LLC. 
            Esta aplicación es software no oficial y no está producida ni respaldada por Scryfall ni Wizards of the Coast[cite: 1].
          </p>
        </div>
      </footer>

    </div>
  );
}
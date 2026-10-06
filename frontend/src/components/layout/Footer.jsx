// ---------------------------------------------------------
// COMPONENTE: FOOTER OFICIAL CONTEXTO LEGAL MTG, SCRYFALL & CARD KINGDOM
// ---------------------------------------------------------
import React from 'react';

export default function Footer({ isLightMode }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`w-full border-t text-xs transition-colors duration-200 mt-auto select-none ${
      isLightMode 
        ? 'bg-[#EAE4D7]/70 border-[#D8CEBC] text-neutral-600' 
        : 'bg-[#0B0B0B] border-neutral-800 text-neutral-400'
    }`}>
      <div className="max-w-4xl mx-auto px-6 py-8 text-center space-y-3 leading-relaxed">
        
        {/* Atribución de Marcas de Wizards of the Coast */}
        <p className="text-[11px]">
          Wizards of the Coast, Magic: The Gathering, and their logos are trademarks of Wizards of the Coast LLC in the United States and other countries. © 1993-{currentYear} Wizards. All Rights Reserved.
        </p>

        {/* Fan Content Policy Disclaimer */}
        <p className="text-[11px]">
          Esta plataforma es contenido de fans no oficial permitido bajo la <span className="font-semibold text-neutral-300">Wizards' Fan Site Policy</span>. No está afiliada, respaldada, patrocinada ni aprobada específicamente por Wizards of the Coast LLC. Las marcas comerciales y propiedad intelectual utilizadas pertenecen a Wizards of the Coast.
        </p>

        {/* Atribución oficial de Scryfall y Card Kingdom */}
        <p className="text-[11px]">
          Los datos canónicos de cartas, reglas Oracle y artes son provistos por <span className="text-amber-500 font-semibold">Scryfall</span>. La información de precios y cotizaciones de mercado de referencia provienen de <span className="text-amber-500 font-semibold">Scryfall</span> y <span className="text-amber-500 font-semibold">Card Kingdom</span>. Ni Scryfall ni Card Kingdom garantizan la exactitud absoluta de las cotizaciones y se aconseja verificar los valores finales en sus respectivas tiendas.
        </p>

        {/* Autoría, Copyright y Versión */}
        <div className={`pt-3 border-t text-[11px] font-mono flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 ${
          isLightMode ? 'border-neutral-300 text-neutral-500' : 'border-neutral-800/80 text-neutral-500'
        }`}>
          <span>© {currentYear} MTG Deckbuilder & Trade</span>
          <span className="hidden sm:inline">•</span>
          <span>Desarrollado por <span className="text-neutral-300 font-semibold">Sebastián Acosta</span></span>
          <span className="hidden sm:inline">•</span>
          <span>Versión 1.0.0</span>
        </div>

      </div>
    </footer>
  );
}
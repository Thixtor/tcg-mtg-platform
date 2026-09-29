// ---------------------------------------------------------
// MODAL: IMPORTACIÓN MASIVA DE LISTAS DE CARTAS (BULK IMPORT)
// ---------------------------------------------------------
import React, { useState } from 'react';
import { X, Layers, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { bulkAddCardsToDeckApi } from '@/api/decks.api';

/**
 * Modal para pegar texto plano de mazos exportados (Moxfield / MTGA) y agregarlos en lote.
 * @param {Object} props
 * @param {boolean} props.isOpen - Bandera de visibilidad del modal.
 * @param {Function} props.onClose - Callback de cierre del modal.
 * @param {string|number} props.deckId - Identificador del mazo destino.
 * @param {Function} [props.onImportSuccess] - Callback ejecutado tras completar la importación.
 */
export default function BulkImportDeckModal({ isOpen, onClose, deckId, onImportSuccess }) {
  const [rawText, setRawText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const [resultSummary, setResultSummary] = useState(null);

  if (!isOpen) return null;

  /**
   * Interpreta texto exportado de Moxfield, MTGA o Archidekt extrayendo nombre limpio, cantidad y categoría.
   * @param {string} text
   * @returns {Array<{ quantity: number, name: string, category: string }>}
   */
  const parseDecklist = (text) => {
    const lines = text.split('\n');
    let currentCategory = 'mainboard';
    const parsed = [];

    const categoryKeywords = {
      commander: 'commander',
      mainboard: 'mainboard',
      deck: 'mainboard',
      sideboard: 'sideboard',
      maybeboard: 'maybeboard',
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      // Detección de encabezados de sección tipo "// Commander" o "Sideboard"
      const normalizedHeader = line.toLowerCase().replace(/[^a-z]/g, '');
      if (categoryKeywords[normalizedHeader]) {
        currentCategory = categoryKeywords[normalizedHeader];
        continue;
      }

      // Regex para "1x Nombre de Carta" o "1 Nombre de Carta (SET) 123 *F*"
      const match = line.match(/^(\d+)[xX]?\s+(.+)$/);
      let qty = 1;
      let name = line;

      if (match) {
        qty = parseInt(match[1], 10);
        name = match[2].trim();
      }

      // 1. Limpieza de caras dobles ("Treasure Map // Treasure Cove" -> "Treasure Map")
      if (name.includes('//')) {
        name = name.split('//')[0].trim();
      }

      // 2. Limpieza de códigos de edición "(LCI) 267", sufijos foil "*F*" y números de coleccionista
      name = name
        .replace(/\s*\([A-Za-z0-9_]+\).*$/, '')
        .replace(/\*F\*/gi, '')
        .trim();

      if (name.length > 0) {
        parsed.push({
          quantity: qty,
          name: name,
          category: currentCategory,
        });
      }
    }

    return parsed;
  };

  /**
   * Ejecuta la resolución por lotes en Scryfall y persiste en FastAPI.
   */
  const handleProcessBulk = async () => {
    if (!rawText.trim()) {
      setErrorMsg('Pega el listado de cartas en el campo de texto.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setResultSummary(null);
    setProgressStatus('Interpretando formato del mazo...');

    try {
      const parsedItems = parseDecklist(rawText);
      if (parsedItems.length === 0) {
        throw new Error('No se detectaron cartas válidas en el texto proporcionado.');
      }

      setProgressStatus(`Consultando Scryfall para ${parsedItems.length} cartas...`);

      // Scryfall /cards/collection permite hasta 75 identificadores por lote
      const BATCH_SIZE = 75;
      const resolvedCards = [];

      for (let i = 0; i < parsedItems.length; i += BATCH_SIZE) {
        const chunk = parsedItems.slice(i, i + BATCH_SIZE);
        const identifiers = chunk.map((item) => ({ name: item.name }));

        const scryfallRes = await fetch('https://api.scryfall.com/cards/collection', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json;q=0.9,*/*;q=0.8',
          },
          body: JSON.stringify({ identifiers }),
        });

        if (!scryfallRes.ok) {
          throw new Error('Error al consultar el catálogo oficial de Scryfall.');
        }

        const scryfallData = await scryfallRes.json();

        // Emparejar cartas resueltas con la cantidad y categoría requeridas
        scryfallData.data?.forEach((card) => {
          const matchItem = chunk.find(
            (c) => c.name.toLowerCase() === card.name.toLowerCase() ||
                   card.name.toLowerCase().startsWith(c.name.toLowerCase())
          );

          if (matchItem) {
            resolvedCards.push({
              scryfall_card_id: card.id,
              quantity: matchItem.quantity,
              category: matchItem.category,
            });
          }
        });
      }

      if (resolvedCards.length === 0) {
        throw new Error('No se pudieron resolver las cartas en Scryfall. Revisa los nombres ingresados.');
      }

      setProgressStatus(`Persistiendo ${resolvedCards.length} cartas en el mazo...`);
      const backendRes = await bulkAddCardsToDeckApi(deckId, resolvedCards);

      setResultSummary(backendRes);
      onImportSuccess?.();

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.warn('[BulkImport] Error procesando importación masiva:', err);
      const detail = err.response?.data?.detail || err.message;
      setErrorMsg(typeof detail === 'string' ? detail : 'Error de comunicación con el servicio de mazos.');
    } finally {
      setIsProcessing(false);
      setProgressStatus('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-sans animate-fadeIn">
      <div className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Cabecera */}
        <div className="px-6 py-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Importar Lista de Mazo (Bulk Import)</h3>
              <p className="text-[11px] text-neutral-400">Compatible con formatos de exportación de Moxfield y MTGA</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={isProcessing}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {resultSummary && (
            <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{resultSummary.message}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block font-semibold">
              Pega tu lista de cartas (Ej: &quot;1 Sol Ring&quot; o encabezados &quot;// Commander&quot; / &quot;// Mainboard&quot;)
            </label>
            <textarea
              rows={9}
              disabled={isProcessing}
              placeholder={`// Commander\n1 Cloud, Ex-SOLDIER\n\n// Mainboard\n1 Sol Ring\n1 Arcane Signet\n1 Command Tower\n38 Plains`}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs font-mono text-neutral-200 placeholder:text-neutral-600 outline-none focus:border-amber-500 resize-none transition"
            />
          </div>

          {progressStatus && (
            <div className="flex items-center gap-2 text-xs text-amber-400 font-mono">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{progressStatus}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between">
          <span className="text-[11px] text-neutral-500 font-mono">Resolución directa con Scryfall</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleProcessBulk}
              disabled={isProcessing || !rawText.trim()}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-md shadow-amber-500/10"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{isProcessing ? 'Procesando...' : 'Importar Cartas'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
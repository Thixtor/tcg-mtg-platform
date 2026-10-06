// ---------------------------------------------------------
// COMPONENTE: BUSCADOR ASÍNCRONO DE CARTAS SCRYFALL CON ABORT E ID ÚNICO
// ---------------------------------------------------------
import React, { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import ManaCost from '@/components/common/ManaSymbol';

export default function ScryfallCardSearch({
  id = "scryfall-search-input",
  name = "scryfallCardSearch",
  placeholder = "Buscar carta en Scryfall...",
  baseQuery = "",
  onSelectCard,
  renderItemExtra,
  debounceMs = 350,
  maxResults = 6,
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const fullQ = baseQuery ? `${baseQuery} ${query.trim()}` : query.trim();
        const res = await fetch(
          `https://api.scryfall.com/cards/search?q=${encodeURIComponent(fullQ)}&order=edhrec`,
          { signal: ctrl.signal }
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.data?.slice(0, maxResults) || []);
        } else {
          setResults([]);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('[ScryfallCardSearch] Error consultando cartas:', err);
        }
      } finally {
        if (!ctrl.signal.aborted) {
          setLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, baseQuery, debounceMs, maxResults]);

  const handleSelect = (card) => {
    onSelectCard?.(card);
    setQuery('');
    setResults([]);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5 pointer-events-none" />
        <input
          id={id}
          name={name}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-600 outline-none focus:border-amber-500 transition"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-2 text-neutral-500 font-mono text-[11px]">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
          <span>Consultando catálogo oficial...</span>
        </div>
      )}

      {results.length > 0 && (
        <div className="divide-y divide-neutral-800 border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900 max-h-[190px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700">
          {results.map((card) => {
            const thumb = card.image_uris?.small || card.card_faces?.[0]?.image_uris?.small;
            return (
              <div
                key={card.id}
                onClick={() => handleSelect(card)}
                className="p-2 flex items-center justify-between gap-2.5 hover:bg-neutral-800/70 cursor-pointer transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-8 bg-neutral-950 rounded shrink-0 overflow-hidden border border-neutral-800">
                    {thumb && <img src={thumb} alt={card.name} className="w-full h-full object-cover" />}
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-xs truncate block text-neutral-200">{card.name}</span>
                    <span className="text-[10px] text-neutral-400 font-mono truncate block">{card.type_line}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <ManaCost costString={card.mana_cost || ''} size="text-[10px]" />
                  {renderItemExtra?.(card)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
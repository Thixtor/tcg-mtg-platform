// ---------------------------------------------------------
// PÁGINA: HOME (ORQUESTADOR MODULAR)
// ---------------------------------------------------------
import React, { useState, useEffect } from 'react';
import { getPublicDecksApi, getMyDecksApi } from '@/api/decks.api';
import { useTheme } from '@/context/ThemeContext';
import { useCardModal } from '@/context/CardModalContext';
import { parseApiError } from '@/utils/apiErrors';

import HomeHeroBanner from '@/components/home/HomeHeroBanner';
import TopDecksSlider from '@/components/home/TopDecksSlider';
import HomeQuickShortcuts from '@/components/home/HomeQuickShortcuts';

export default function HomePage({
  currentUser,
  onNavigateToCatalog,
  onNavigateToTradeWall,
  onSelectDeck,
  onNavigateToUserProfile,
  onOpenAuthModal,
  onOpenCreateDeckModal,
  onOpenCreateCollectionModal
}) {
  const { isLightMode } = useTheme();
  const { openCard } = useCardModal();

  const [topDecks, setTopDecks] = useState([]);
  const [loadingDecks, setLoadingDecks] = useState(true);

  // Carga y ordenamiento del Top 10
  useEffect(() => {
    const ctrl = new AbortController();
    setLoadingDecks(true);

    getPublicDecksApi({ limit: 20, sort_by: 'upvotes' }, { signal: ctrl.signal })
      .then(async (data) => {
        let list = Array.isArray(data) ? data : (data?.data || data?.items || []);
        
        if (list.length === 0) {
          try {
            const myDecks = await getMyDecksApi({ signal: ctrl.signal });
            const myDecksList = Array.isArray(myDecks) ? myDecks : (myDecks?.data || []);
            list = myDecksList.filter((d) => d.is_public !== false);
          } catch {
            // Sin fallback
          }
        }

        const sortedTop10 = list
          .sort((a, b) => (b.upvotes_count || b.likes_count || b.total_cards || 0) - (a.upvotes_count || a.likes_count || a.total_cards || 0))
          .slice(0, 10);

        setTopDecks(sortedTop10);
      })
      .catch(async (err) => {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          console.warn('[Home] Error cargando Top 10:', parseApiError(err));
          try {
            const myDecks = await getMyDecksApi({ signal: ctrl.signal });
            setTopDecks((Array.isArray(myDecks) ? myDecks : []).slice(0, 10));
          } catch {
            setTopDecks([]);
          }
        }
      })
      .finally(() => setLoadingDecks(false));

    return () => ctrl.abort();
  }, []);

  return (
    <div className={`min-h-[calc(100vh-4rem)] transition-colors duration-200 select-none ${
      isLightMode ? 'bg-[#FAF7F2] text-[#24211E]' : 'bg-[#0B0B0B] text-neutral-100'
    }`}>
      {/* 1. Hero Banner con Buscador */}
      <HomeHeroBanner
        currentUser={currentUser}
        isLightMode={isLightMode}
        onNavigateToCatalog={onNavigateToCatalog}
        onOpenAuthModal={onOpenAuthModal}
        onOpenCreateDeckModal={onOpenCreateDeckModal}
        onOpenCreateCollectionModal={onOpenCreateCollectionModal}
        onOpenCard={openCard}
      />

      {/* 2. Contenido Central */}
      <div className="max-w-[1920px] mx-auto px-6 sm:px-12 py-10 space-y-12">
        {/* Slider Top 10 Crunchyroll */}
        <TopDecksSlider
          topDecks={topDecks}
          loading={loadingDecks}
          onSelectDeck={onSelectDeck}
        />

        {/* Accesos Directos */}
        <HomeQuickShortcuts
          isLightMode={isLightMode}
          onNavigateToCatalog={onNavigateToCatalog}
          onNavigateToTradeWall={onNavigateToTradeWall}
        />
      </div>
    </div>
  );
}
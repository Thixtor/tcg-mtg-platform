// ---------------------------------------------------------
// PÁGINA: HOME (ORQUESTADOR MODULAR SIN BUCLES DE ERROR)
// ---------------------------------------------------------
import React, { useState, useEffect } from 'react';
import { getPublicDecksApi, getMyDecksApi } from '@/api/decks.api';
import { useTheme } from '@/context/ThemeContext';
import { useCardModal } from '@/context/CardModalContext';
import { parseApiError } from '@/utils/apiErrors';

import HomeHeroBanner from '@/components/home/HomeHeroBanner';
import TopCardsSlider from '@/components/home/TopCardsSlider';
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

  // Carga controlada del Top 10 de Mazos
  useEffect(() => {
    const ctrl = new AbortController();
    setLoadingDecks(true);

    getPublicDecksApi({ limit: 20, sort_by: 'upvotes' }, { signal: ctrl.signal })
      .then(async (data) => {
        let list = Array.isArray(data) ? data : (data?.data || data?.items || []);

        // Si no hay mazos públicos y hay un usuario logueado, consultar los propios
        if (list.length === 0 && currentUser) {
          try {
            const myDecks = await getMyDecksApi({ signal: ctrl.signal });
            const myDecksList = Array.isArray(myDecks) ? myDecks : (myDecks?.data || []);
            list = myDecksList.filter((d) => d.is_public !== false);
          } catch {
            list = [];
          }
        }

        const sortedTop10 = list
          .sort((a, b) => (b.upvotes_count || b.likes_count || b.total_cards || 0) - (a.upvotes_count || a.likes_count || a.total_cards || 0))
          .slice(0, 10);

        setTopDecks(sortedTop10);
      })
      .catch((err) => {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          console.warn('[Home] Error cargando Top 10 de mazos:', parseApiError(err));
          setTopDecks([]);
        }
      })
      .finally(() => setLoadingDecks(false));

    return () => ctrl.abort();
  }, [currentUser]);

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
      <div className="max-w-[1920px] mx-auto px-6 sm:px-12 py-10 space-y-14">
        {/* 1°: Top 10 Cartas Más Buscadas */}
        <TopCardsSlider
          isLightMode={isLightMode}
          onOpenCard={openCard}
        />

        {/* 2°: Top 10 Mazos Más Votados */}
        <TopDecksSlider
          topDecks={topDecks}
          loading={loadingDecks}
          onSelectDeck={onSelectDeck}
        />

        {/* 3°: Accesos Directos */}
        <HomeQuickShortcuts
          isLightMode={isLightMode}
          onNavigateToCatalog={onNavigateToCatalog}
          onNavigateToTradeWall={onNavigateToTradeWall}
        />
      </div>
    </div>
  );
}
// ---------------------------------------------------------
// CONTEXTO GLOBAL: MODAL CENTRALIZADO DE DETALLE DE CARTA
// ---------------------------------------------------------
import React, { createContext, useContext, useState, useCallback } from 'react';
import CardDetailModal from '@/components/modal/CardDetailModal';

const CardModalContext = createContext(null);

export function CardModalProvider({ children }) {
  const [selectedCard, setSelectedCard] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const openCard = useCallback((card) => {
    if (!card) return;
    setSelectedCard(card);
    setIsOpen(true);
  }, []);

  const closeCard = useCallback(() => {
    setIsOpen(false);
    setSelectedCard(null);
  }, []);

  return (
    <CardModalContext.Provider value={{ openCard, closeCard, isOpen, selectedCard }}>
      {children}
      <CardDetailModal
        isOpen={isOpen}
        onClose={closeCard}
        card={selectedCard}
      />
    </CardModalContext.Provider>
  );
}

/**
 * Hook para invocar la inspección detallada de una carta desde cualquier componente.
 */
export function useCardModal() {
  const context = useContext(CardModalContext);
  if (!context) {
    throw new Error('useCardModal debe ser utilizado dentro de un CardModalProvider');
  }
  return context;
}

export default CardModalContext;
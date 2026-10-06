// ---------------------------------------------------------
// COMPONENTE: CONTENEDOR DE MODALES GLOBALES (DECKS Y COLECCIONES)
// ---------------------------------------------------------
import React from 'react';
import AuthModal from '@/components/auth/AuthModal';
import EditProfileModal from '@/components/profile/EditProfileModal';
import CreateDeckModal from '@/components/decks/CreateDeckModal';
import CreateCollectionModal from '@/components/collections/CreateCollectionModal';
import { createMyCollectionApi } from '@/api/collections';

export default function GlobalModals({
  currentUser,
  isAuthModalOpen,
  onCloseAuthModal,
  onLoginSuccess,
  isEditProfileModalOpen,
  onCloseEditProfileModal,
  onProfileUpdated,
  isCreateDeckModalOpen,
  onCloseCreateDeckModal,
  deckCount,
  onDeckCreated,
  isCreateCollectionModalOpen,
  onCloseCreateCollectionModal,
  onCollectionCreated,
  collectionCount = 0
}) {
  const handleCreateCollection = async (payload) => {
    try {
      const newCollection = await createMyCollectionApi(payload);
      onCollectionCreated?.(newCollection);
      onCloseCreateCollectionModal?.();
    } catch (err) {
      console.error('[GlobalModals] Error creando colección:', err);
    }
  };

  return (
    <>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={onCloseAuthModal}
        onLoginSuccess={onLoginSuccess}
      />

      <EditProfileModal
        isOpen={isEditProfileModalOpen}
        onClose={onCloseEditProfileModal}
        user={currentUser}
        onProfileUpdated={onProfileUpdated}
      />

      <CreateDeckModal
        isOpen={isCreateDeckModalOpen}
        onClose={onCloseCreateDeckModal}
        currentDeckCount={deckCount}
        onDeckCreated={onDeckCreated}
      />

      {isCreateCollectionModalOpen && (
        <CreateCollectionModal
          isOpen={isCreateCollectionModalOpen}
          onClose={onCloseCreateCollectionModal}
          onCreate={handleCreateCollection}
          currentCount={collectionCount}
        />
      )}
    </>
  );
}
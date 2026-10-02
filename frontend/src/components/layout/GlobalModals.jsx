// ---------------------------------------------------------
// COMPONENTE: CONTENEDOR DE MODALES GLOBALES
// ---------------------------------------------------------
import React from 'react';
import AuthModal from '@/components/auth/AuthModal';
import EditProfileModal from '@/components/profile/EditProfileModal';
import CreateDeckModal from '@/components/decks/CreateDeckModal';

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
  onDeckCreated
}) {
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
    </>
  );
}
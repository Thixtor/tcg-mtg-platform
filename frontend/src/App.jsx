// ---------------------------------------------------------
// COMPONENTE PRINCIPAL: APP ORQUESTADOR (ACCIONES RÁPIDAS Y FOOTER)
// ---------------------------------------------------------
import React, { useState, useEffect } from 'react';

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import GlobalModals from '@/components/layout/GlobalModals';

import HomePage from '@/pages/HomePage';
import { CatalogPage } from '@/pages/CatalogPage';
import BindersPage from '@/pages/CollectionsPage';
import DecksPage from '@/pages/DecksPage';
import ProfilePage from '@/pages/ProfilePage';
import PublicProfilePage from '@/pages/PublicProfilePage';
import TradeWallPage from '@/pages/TradeWallPage';

import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { CardModalProvider } from '@/context/CardModalContext';
import { getCurrentUser, saveSession, clearSession, getAccessToken } from '@/services/session.service';

function AppContent() {
  const { isLightMode, toggleTheme } = useTheme();

  // Estados de navegación y usuario
  const [activeTab, setActiveTab] = useState('home');
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [deckCount, setDeckCount] = useState(0);
  const [selectedDeckId, setSelectedDeckId] = useState(null);
  const [selectedBinderId, setSelectedBinderId] = useState(null);
  const [viewingUserId, setViewingUserId] = useState(null);
  const [previousTab, setPreviousTab] = useState('home');

  // Estado para transferir búsquedas directas hacia el Catálogo
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');

  // Estados de modales y disparadores
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isCreateDeckModalOpen, setIsCreateDeckModalOpen] = useState(false);
  const [isCreateCollectionModalOpen, setIsCreateCollectionModalOpen] = useState(false);
  const [refreshDecksTrigger, setRefreshDecksTrigger] = useState(0);
  const [refreshBindersTrigger, setRefreshBindersTrigger] = useState(0);

  // Cierre de sesión por interceptor 401 protegido
  useEffect(() => {
    const handleGlobalLogout = () => {
      setCurrentUser((prev) => {
        if (!prev) return null;
        return null;
      });
      setSelectedDeckId(null);
      setSelectedBinderId(null);
      setViewingUserId(null);
      setIsCreateDeckModalOpen(false);
      setIsCreateCollectionModalOpen(false);
      setCatalogSearchQuery('');
    };

    window.addEventListener('mtg:logout', handleGlobalLogout);
    return () => window.removeEventListener('mtg:logout', handleGlobalLogout);
  }, []);

  const handleSelectUser = (userData, accessToken = null) => {
    if (!userData) return;
    saveSession({
      user: userData,
      access_token: accessToken || getAccessToken() || ''
    });
    setCurrentUser(userData);
  };

  const handleLogout = () => {
    clearSession();
    setCurrentUser(null);
    setActiveTab('home');
    setSelectedDeckId(null);
    setSelectedBinderId(null);
    setViewingUserId(null);
    setIsCreateDeckModalOpen(false);
    setIsCreateCollectionModalOpen(false);
    setCatalogSearchQuery('');
  };

  const handleProfileUpdated = (updatedFields) => {
    setCurrentUser((prev) => {
      const updated = { ...prev, ...updatedFields };
      saveSession({ user: updated, access_token: getAccessToken() || '' });
      return updated;
    });
  };

  const handleNavigateTab = (tab) => {
    setActiveTab(tab);
    setSelectedDeckId(null);
    setSelectedBinderId(null);
    setViewingUserId(null);
    if (tab !== 'catalog') {
      setCatalogSearchQuery('');
    }
  };

  const handleNavigateToPublicProfile = (targetUserId) => {
    if (!targetUserId) return;
    if (currentUser?.id && String(currentUser.id) === String(targetUserId)) {
      setActiveTab('profile');
      setViewingUserId(null);
      return;
    }
    setPreviousTab(activeTab);
    setViewingUserId(targetUserId);
    setActiveTab('public-profile');
  };

  const handleDeckCreated = (createdDeck) => {
    setRefreshDecksTrigger((prev) => prev + 1);
    if (createdDeck?.id) {
      setSelectedDeckId(createdDeck.id);
      setActiveTab('decks');
    }
  };

  // Abre el modal rápido de colección
  const handleTriggerCreateCollection = () => {
    setIsCreateCollectionModalOpen(true);
  };

  // Al crear la colección, redirige directamente a su espacio de trabajo como ocurre con los decks
  const handleCollectionCreated = (newCollection) => {
    setRefreshBindersTrigger((prev) => prev + 1);
    if (newCollection?.id) {
      setSelectedBinderId(newCollection.id);
      setActiveTab('binders');
    }
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 selection:bg-amber-500 selection:text-neutral-950 ${
      isLightMode ? 'bg-[#FAF7F2] text-[#24211E]' : 'bg-[#0B0B0B] text-neutral-100'
    }`}>
      
      {/* 1. NAVBAR MODULAR */}
      <Navbar
        activeTab={activeTab}
        currentUser={currentUser}
        isLightMode={isLightMode}
        onNavigateTab={handleNavigateTab}
        onToggleTheme={toggleTheme}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenEditProfileModal={() => setIsEditProfileModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* 2. ENRUTADOR DE CONTENIDO */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'home' && (
          <HomePage 
            currentUser={currentUser}
            onNavigateToCatalog={(query) => {
              setCatalogSearchQuery(query || '');
              setActiveTab('catalog');
            }}
            onNavigateToTradeWall={() => setActiveTab('tradewall')}
            onSelectDeck={(deckId) => {
              setSelectedDeckId(deckId);
              setActiveTab('decks');
            }}
            onNavigateToUserProfile={handleNavigateToPublicProfile}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onOpenCreateDeckModal={() => setIsCreateDeckModalOpen(true)}
            onOpenCreateCollectionModal={handleTriggerCreateCollection}
          />
        )}

        {activeTab === 'catalog' && (
          <CatalogPage 
            initialSearch={catalogSearchQuery} 
            onClearInitialSearch={() => setCatalogSearchQuery('')} 
          />
        )}
        
        {activeTab === 'binders' && (
          <BindersPage 
            userId={currentUser?.id} 
            selectedBinderId={selectedBinderId}
            onSelectBinderId={setSelectedBinderId}
            openCreateTrigger={refreshBindersTrigger}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onNavigateToTradeWall={() => setActiveTab('tradewall')} 
            onNavigateToCatalog={() => {
              setCatalogSearchQuery('');
              setActiveTab('catalog');
            }}
          />
        )}

        {activeTab === 'decks' && (
          <DecksPage 
            currentUser={currentUser}
            onDeckCountChange={setDeckCount}
            refreshTrigger={refreshDecksTrigger}
            onOpenCreateDeckModal={() => setIsCreateDeckModalOpen(true)}
            onNavigateToTradeWall={() => setActiveTab('tradewall')}
            selectedDeckId={selectedDeckId}
            onSelectDeckId={setSelectedDeckId}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        )}

        {activeTab === 'tradewall' && (
          <TradeWallPage 
            currentUser={currentUser} 
            onNavigateToCatalog={() => setActiveTab('catalog')}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onNavigateToProfile={handleNavigateToPublicProfile}
          />
        )}

        {activeTab === 'profile' && (
          <ProfilePage 
            user={currentUser} 
            onOpenBinderModal={() => setActiveTab('binders')}
            onOpenTradeModal={() => setActiveTab('tradewall')}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onEditProfileModal={() => setIsEditProfileModalOpen(true)}
            onNavigateToCatalog={() => setActiveTab('catalog')}
          />
        )}

        {activeTab === 'public-profile' && viewingUserId && (
          <PublicProfilePage 
            userId={viewingUserId}
            currentUserId={currentUser?.id}
            onBack={() => {
              setActiveTab(previousTab || 'home');
              setViewingUserId(null);
            }}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onSelectDeck={(deckId) => {
              setSelectedDeckId(deckId);
              setActiveTab('decks');
              setViewingUserId(null);
            }}
          />
        )}
      </main>

      {/* 3. PIE DE PÁGINA CON CRÉDITOS OFICIALES Y SCRYFALL */}
      <Footer isLightMode={isLightMode} />

      {/* 4. MODALES GLOBALES MODULARIZADOS */}
      <GlobalModals
        currentUser={currentUser}
        isAuthModalOpen={isAuthModalOpen}
        onCloseAuthModal={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(user) => {
          handleSelectUser(user);
          setIsAuthModalOpen(false);
        }}
        isEditProfileModalOpen={isEditProfileModalOpen}
        onCloseEditProfileModal={() => setIsEditProfileModalOpen(false)}
        onProfileUpdated={handleProfileUpdated}
        isCreateDeckModalOpen={isCreateDeckModalOpen}
        onCloseCreateDeckModal={() => setIsCreateDeckModalOpen(false)}
        deckCount={deckCount}
        onDeckCreated={handleDeckCreated}
        isCreateCollectionModalOpen={isCreateCollectionModalOpen}
        onCloseCreateCollectionModal={() => setIsCreateCollectionModalOpen(false)}
        onCollectionCreated={handleCollectionCreated}
      />

    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <CardModalProvider>
        <AppContent />
      </CardModalProvider>
    </ThemeProvider>
  );
}
// ---------------------------------------------------------
// PÁGINA: PERFIL DE USUARIO Y DASHBOARD P2P
// ---------------------------------------------------------
import React, { useState } from 'react';
import ProfileHeader from '../components/profile/ProfileHeader';
import SecuritySidebar from '../components/profile/SecuritySidebar';
import { 
  Layers, 
  Sparkles, 
  Repeat, 
  Lock, 
  Search, 
  Filter, 
  FolderPlus 
} from 'lucide-react';

export default function ProfilePage({ user, onOpenBinderModal, onOpenTradeModal }) {
  const [activeTab, setActiveTab] = useState('binders');
  const [selectedBinderId, setSelectedBinderId] = useState('b3');
  const [binderSearchTerm, setBinderSearchTerm] = useState('');

  // Carpetas de muestra
  const bindersList = [
    {
      id: 'b1',
      name: 'Commander Staples',
      type: 'TRADE',
      cardCount: 142,
      isPublicTrade: true,
      artUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=60'
    },
    {
      id: 'b2',
      name: 'Foils & Rares',
      type: 'COLLECTION',
      cardCount: 96,
      isPublicTrade: false,
      artUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=60'
    },
    {
      id: 'b3',
      name: 'Modern Deckbox',
      type: 'PLAYSET',
      cardCount: 75,
      isPublicTrade: true,
      artUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=500&auto=format&fit=crop&q=60'
    }
  ];

  // Cartas del binder seleccionado
  const sampleCards = [
    { id: '1', name: 'Sol Ring', set: 'Commander', price: 2.15, condition: 'NM', isFoil: true, isForTrade: true, img: 'https://cards.scryfall.io/normal/front/1/7/17700a94-4363-4903-90d1-ad81832b49df.jpg' },
    { id: '2', name: 'Rhystic Study', set: 'Prophecy', price: 38.30, condition: 'LP', isFoil: false, isForTrade: true, img: 'https://cards.scryfall.io/normal/front/d/6/d6914dba-0d27-4055-ac34-b3ebf5802221.jpg' },
    { id: '3', name: 'Smothering Tithe', set: 'Ravnica Allegiance', price: 24.50, condition: 'NM', isFoil: true, isForTrade: false, img: 'https://cards.scryfall.io/normal/front/f/2/f25a4bbe-2af0-4d4a-95d4-d52c59d73b3e.jpg' },
    { id: '4', name: 'Cyclonic Rift', set: 'Return to Ravnica', price: 31.00, condition: 'NM', isFoil: false, isForTrade: true, img: 'https://cards.scryfall.io/normal/front/f/f/ff08e5ed-f47b-4d8e-8b8b-41675dccef8b.jpg' },
    { id: '5', name: 'The One Ring', set: 'Tales of Middle-earth', price: 112.00, condition: 'NM', isFoil: true, isForTrade: false, img: 'https://cards.scryfall.io/normal/front/9/3/93de71ff-0972-4f3a-8cf1-83c4fb871370.jpg' },
    { id: '6', name: 'Demonic Tutor', set: 'Ultimate Masters', price: 44.20, condition: 'NM', isFoil: true, isForTrade: true, img: 'https://cards.scryfall.io/normal/front/3/b/3b42313b-7f1e-4963-8a93-c79308a38329.jpg' },
    { id: '7', name: 'Esper Sentinel', set: 'Modern Horizons 2', price: 29.10, condition: 'NM', isFoil: false, isForTrade: true, img: 'https://cards.scryfall.io/normal/front/f/3/f3537373-ef54-4578-9d05-6216420ee349.jpg' },
    { id: '8', name: 'Dockside Extortionist', set: 'Commander 2019', price: 69.00, condition: 'LP', isFoil: false, isForTrade: false, img: 'https://cards.scryfall.io/normal/front/5/7/571bc9eb-8d13-4008-86b5-2e348a326d58.jpg' },
    { id: '9', name: 'Ancient Copper Dragon', set: 'Commander Legends 2', price: 67.50, condition: 'NM', isFoil: true, isForTrade: true, img: 'https://cards.scryfall.io/normal/front/3/8/3836dddd-a7e4-499f-ad49-ce298aa65720.jpg' },
    { id: '10', name: 'Vampiric Tutor', set: 'Commander Legends', price: 41.00, condition: 'NM', isFoil: false, isForTrade: true, img: 'https://cards.scryfall.io/normal/front/1/8/18bd5048-bdd1-4e9b-bc56-3404f0664f33.jpg' }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 space-y-6 text-neutral-100 font-sans">
      
      {/* 1. CABECERA MODULAR */}
      <ProfileHeader 
        user={user} 
        onEditProfile={() => {}} 
        onTradeSettings={() => {}} 
      />

      {/* 2. BARRA DE PESTAÑAS */}
      <nav className="flex items-center gap-6 border-b border-neutral-800 text-sm font-medium">
        <button
          onClick={() => setActiveTab('binders')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'binders'
              ? 'border-amber-500 text-white font-bold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Layers className="w-4 h-4" /> My Binders & Inventory
        </button>

        <button
          onClick={() => setActiveTab('wishlist')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'wishlist'
              ? 'border-amber-500 text-white font-bold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Sparkles className="w-4 h-4" /> My Wishlist
        </button>

        <button
          onClick={() => setActiveTab('matches')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'matches'
              ? 'border-amber-500 text-white font-bold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Repeat className="w-4 h-4" /> Mutual Matches (P2P)
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-neutral-950 font-mono">3</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'security'
              ? 'border-amber-500 text-white font-bold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Lock className="w-4 h-4" /> Account & Phone Security
        </button>
      </nav>

      {/* 3. CONTENIDO: BINDERS + SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LADO IZQUIERDO: BINDERS Y CARTAS (8 COLS) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Fila de Binders */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {bindersList.map((binder) => (
              <div 
                key={binder.id}
                onClick={() => setSelectedBinderId(binder.id)}
                className={`group relative rounded-xl border overflow-hidden cursor-pointer transition ${
                  selectedBinderId === binder.id 
                    ? 'border-amber-500 bg-neutral-900 shadow-md shadow-amber-500/5' 
                    : 'border-neutral-800 bg-neutral-900/40 hover:border-neutral-700'
                }`}
              >
                <div className="h-16 w-full relative overflow-hidden bg-neutral-950">
                  <img src={binder.artUrl} alt="" className="w-full h-full object-cover opacity-30 group-hover:scale-105 transition duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 to-transparent" />
                  <span className="absolute top-2 left-2 text-[9px] font-mono px-1.5 py-0.5 rounded bg-neutral-950/80 text-neutral-300 border border-neutral-800">
                    {binder.type}
                  </span>
                </div>

                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white truncate">{binder.name}</h3>
                    <span className="text-[10px] text-neutral-500 font-mono">{binder.cardCount} cards</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-neutral-800/60">
                    <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${binder.isPublicTrade ? 'bg-emerald-500' : 'bg-neutral-600'}`} />
                      Public trade binder
                    </span>
                    <input 
                      type="checkbox" 
                      checked={binder.isPublicTrade} 
                      readOnly 
                      className="accent-emerald-500 rounded" 
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Barra de Filtros del Binder */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-neutral-900/40 border border-neutral-800 p-3 rounded-xl">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-sm font-bold text-white">Modern Deckbox</span>
              <span className="text-xs text-neutral-500 font-mono">(18 / 200)</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search your cards..."
                  value={binderSearchTerm}
                  onChange={(e) => setBinderSearchTerm(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-8 pr-3 py-1 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-300 border border-neutral-700 transition">
                <Filter className="w-3.5 h-3.5" /> Filters
              </button>

              <button 
                onClick={onOpenBinderModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-bold text-neutral-950 transition"
              >
                <FolderPlus className="w-3.5 h-3.5" /> + New Binder <span className="font-mono text-[10px] opacity-80">(3/10)</span>
              </button>
            </div>
          </div>

          {/* Grid de Cartas */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {sampleCards.map((card) => (
              <div key={card.id} className="group relative bg-neutral-900/80 border border-neutral-800 rounded-xl p-2 flex flex-col space-y-2 hover:border-amber-500/60 transition">
                <div className="relative aspect-[2.5/3.5] w-full rounded-lg overflow-hidden bg-neutral-950">
                  <img 
                    src={card.img} 
                    alt={card.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300" 
                  />

                  <div className="absolute top-1.5 right-1.5">
                    {card.isForTrade ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950/80 border border-emerald-600 text-emerald-400">
                        FOR TRADE
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-neutral-900/80 border border-neutral-700 text-neutral-400">
                        PERSONAL
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-bold text-white truncate">{card.name}</div>
                  <div className="text-[10px] text-neutral-500 truncate">{card.set}</div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1 text-[9px] font-mono">
                      <span className="px-1 rounded bg-neutral-800 text-neutral-300">{card.condition}</span>
                      {card.isFoil && <span className="px-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">FOIL</span>}
                    </div>
                    <span className="text-xs font-bold font-mono text-amber-400">${card.price.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* LADO DERECHO: WIDGETS DE SEGURIDAD (4 COLS) */}
        <div className="lg:col-span-4">
          <SecuritySidebar 
            phone={user?.phone_number}
            isVerified={user?.is_phone_verified ?? true}
            onOpenTradeMatches={onOpenTradeModal}
            onReverifyPhone={() => {}}
          />
        </div>

      </div>

    </div>
  );
}
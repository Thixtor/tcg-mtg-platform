import React, { useState, useEffect } from 'react';

const API_BASE = "http://localhost:8000";

export default function App() {
  const [activeTab, setActiveTab] = useState("search"); // "search" o "market"
  const [query, setQuery] = useState("");
  const [cards, setCards] = useState([]);
  const [marketItems, setMarketItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState("Comprobando conexión...");

  // Verificar conexión inicial con FastAPI
  useEffect(() => {
    fetch(`${API_BASE}/`)
      .then((res) => res.json())
      .then((data) => setBackendStatus("🟢 Conectado a FastAPI"))
      .catch(() => setBackendStatus("🔴 No se pudo conectar al Backend"));
  }, []);

  // Buscar cartas en el backend local
  const handleSearch = async (e) => {
    e.preventDefault();
    if (query.trim().length < 2) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/cards/search?q=${encodeURIComponent(query)}&limit=24`);
      if (res.ok) {
        const data = await res.json();
        setCards(data);
      }
    } catch (err) {
      console.error("Error buscando cartas:", err);
    } finally {
      setLoading(false);
    }
  };

  // Cargar cartas del mercado de trade
  const loadTradeMarket = async () => {
    setActiveTab("market");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/trade/market`);
      if (res.ok) {
        const data = await res.json();
        setMarketItems(data);
      }
    } catch (err) {
      console.error("Error cargando mercado:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      {/* Encabezado */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#38bdf8' }}>🃏 MTG TCG Market & Trade</h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>{backendStatus}</p>
        </div>
        <nav style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setActiveTab("search")}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
              backgroundColor: activeTab === 'search' ? '#0284c7' : '#1e293b',
              color: '#ffffff'
            }}
          >
            🔍 Buscador de Cartas
          </button>
          <button
            onClick={loadTradeMarket}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
              backgroundColor: activeTab === 'market' ? '#0284c7' : '#1e293b',
              color: '#ffffff'
            }}
          >
            🔄 Mercado de Trade
          </button>
        </nav>
      </header>

      {/* VISTA 1: BUSCADOR DE CARTAS */}
      {activeTab === "search" && (
        <section>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <input
              type="text"
              placeholder="Busca por nombre (ej. Sol Ring, Lightning Bolt, Atraxa)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #334155',
                backgroundColor: '#1e293b',
                color: '#fff',
                fontSize: '1rem'
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 24px',
                backgroundColor: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              {loading ? "Buscando..." : "Buscar"}
            </button>
          </form>

          {/* Grilla de Resultados */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
            {cards.map((card) => (
              <div
                key={card.id}
                style={{
                  backgroundColor: '#1e293b',
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  border: '1px solid #334155',
                  transition: 'transform 0.15s ease'
                }}
              >
                {card.image_url ? (
                  <img
                    src={card.image_url}
                    alt={card.name}
                    style={{ width: '100%', borderRadius: '8px', aspectRatio: '2.5/3.5', objectFit: 'cover' }}
                    loading="lazy"
                  />
                ) : (
                  <div style={{ height: '280px', backgroundColor: '#334155', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    Sin Imagen
                  </div>
                )}
                <h3 style={{ fontSize: '1rem', margin: '10px 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {card.name}
                </h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                  Set: {card.set?.toUpperCase()} | {card.mana_cost || "N/A"}
                </p>
              </div>
            ))}
          </div>
          {!loading && cards.length === 0 && (
            <p style={{ textAlign: 'center', color: '#64748b', marginTop: '40px' }}>
              Escribe el nombre de una carta para consultar el catálogo local.
            </p>
          )}
        </section>
      )}

      {/* VISTA 2: MERCADO DE TRADE */}
      {activeTab === "market" && (
        <section>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '16px', color: '#38bdf8' }}>Cartas Disponibles para Intercambio</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
            {marketItems.map((item) => (
              <div
                key={item.user_card_id}
                style={{
                  backgroundColor: '#1e293b',
                  borderRadius: '12px',
                  padding: '14px',
                  border: '1px solid #0284c7'
                }}
              >
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.card_name}
                    style={{ width: '100%', borderRadius: '8px', marginBottom: '10px' }}
                  />
                )}
                <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem' }}>{item.card_name}</h3>
                <p style={{ margin: '2px 0', fontSize: '0.85rem', color: '#cbd5e1' }}>
                  Estado: <strong>{item.condition}</strong> {item.is_foil ? "✨ Foil" : ""}
                </p>
                {item.trade_notes && (
                  <p style={{ margin: '6px 0', fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                    "{item.trade_notes}"
                  </p>
                )}
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #334155', fontSize: '0.85rem' }}>
                  <p style={{ margin: '2px 0', color: '#38bdf8' }}>👤 {item.owner_username} (⭐ {item.owner_reputation})</p>
                  <p style={{ margin: '2px 0', color: '#4ade80' }}>📱 {item.owner_phone}</p>
                </div>
              </div>
            ))}
          </div>
          {!loading && marketItems.length === 0 && (
            <p style={{ textAlign: 'center', color: '#64748b', marginTop: '40px' }}>
              No hay cartas marcadas para trade por usuarios verificados en este momento.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
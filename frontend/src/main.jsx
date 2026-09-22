import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';

function App() {
  const [mensajeBackend, setMensajeBackend] = useState('Conectando con el servidor...');

  // Hook que se ejecuta cuando el componente se carga por primera vez
  useEffect(() => {
    fetch('http://localhost:8000/')
      .then((res) => res.json())
      .then((data) => setMensajeBackend(data.mensaje))
      .catch(() => setMensajeBackend('Error al conectar con la API'));
  }, []);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2.5rem', textAlign: 'center' }}>
      <h1>🃏 TCG Card Market & Exchange</h1>
      <p style={{ fontSize: '1.2rem' }}>
        <strong>Respuesta de FastAPI:</strong> {mensajeBackend}
      </p>
    </div>
  );
}

// Montar la app en el div 'root'
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
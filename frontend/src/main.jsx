// ---------------------------------------------------------
// PUNTO DE ENTRADA PRINCIPAL (MAIN CON ERROR BOUNDARY GLOBAL)
// ---------------------------------------------------------
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/common/ErrorBoundary';
import './index.css'; // <-- Carga todos los estilos y utilidades de Tailwind

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
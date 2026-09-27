// ---------------------------------------------------------
// PUNTO DE ENTRADA PRINCIPAL (MAIN)
// ---------------------------------------------------------
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css'; // <-- Carga todos los estilos y utilidades de Tailwind

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
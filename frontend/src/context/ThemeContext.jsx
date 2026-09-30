// ---------------------------------------------------------
// CONTEXTO GLOBAL DE TEMA (DARK / BONE PAPER LIGHT)
// ---------------------------------------------------------
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isLightMode, setIsLightMode] = useState(() => {
    const saved = localStorage.getItem('app_theme');
    return saved ? saved === 'light' : false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isLightMode) {
      root.classList.add('light-theme');
      root.classList.remove('dark-theme');
      localStorage.setItem('app_theme', 'light');
    } else {
      root.classList.add('dark-theme');
      root.classList.remove('light-theme');
      localStorage.setItem('app_theme', 'dark');
    }
  }, [isLightMode]);

  const toggleTheme = () => setIsLightMode((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ isLightMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de un ThemeProvider');
  }
  return context;
}
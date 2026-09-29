// ---------------------------------------------------------
// GESTOR UNIFICADO DE SESIÓN (LOCAL STORAGE + EVENTOS REACT)
// ---------------------------------------------------------
const SESSION_KEY = 'mtg_user_session';

export const getSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('Error al leer sesión:', error);
    return null;
  }
};

export const getAccessToken = () => {
  return getSession()?.access_token || null;
};

export const getCurrentUser = () => {
  return getSession()?.user || null;
};

export const saveSession = (sessionData) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  window.dispatchEvent(new CustomEvent('mtg:auth-change', { detail: sessionData }));
};

export const clearSession = () => {
  localStorage.removeItem(SESSION_KEY);
  // Limpieza defensiva de claves legadas
  localStorage.removeItem('mtg_access_token');
  localStorage.removeItem('token');
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
  localStorage.removeItem('mtg_dev_user');

  // Notificar al árbol de componentes de React para forzar el logout en memoria
  window.dispatchEvent(new Event('mtg:logout'));
};
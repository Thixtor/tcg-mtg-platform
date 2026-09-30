// ---------------------------------------------------------
// GESTIÓN CENTRALIZADA DE SESIÓN Y LOCALSTORAGE
// ---------------------------------------------------------

const ACCESS_TOKEN_KEY = 'access_token';
const USER_DATA_KEY = 'user';
const DEV_USER_KEY = 'mtg_dev_user';

/**
 * Guarda el token JWT y el perfil del usuario autenticado.
 * @param {Object} params
 * @param {string} [params.access_token] - Token JWT Bearer emitido por el backend.
 * @param {Object} [params.user] - Objeto con los datos del usuario autenticado.
 */
export const saveSession = ({ access_token, user }) => {
  try {
    if (access_token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
    }
    if (user) {
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
    }
  } catch (error) {
    console.warn('[Session] Error persistiendo la sesión en localStorage:', error);
  }
};

/**
 * Recupera el Access Token para los encabezados del transporte HTTP.
 * @returns {string|null}
 */
export const getAccessToken = () => {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.warn('[Session] Error leyendo token de localStorage:', error);
    return null;
  }
};

/**
 * Recupera los datos del usuario en sesión activa.
 * @returns {Object|null}
 */
export const getCurrentUser = () => {
  try {
    const userRaw = localStorage.getItem(USER_DATA_KEY);
    if (!userRaw) return null;
    return JSON.parse(userRaw);
  } catch (error) {
    console.warn('[Session] Error parseando datos de usuario:', error);
    return null;
  }
};

/**
 * Elimina todas las credenciales y datos de usuario en almacenamiento local
 * ante logout voluntario o expiración de token confirmada (401).
 */
export const clearSession = () => {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    localStorage.removeItem(DEV_USER_KEY);
  } catch (error) {
    console.warn('[Session] Error limpiando la sesión de localStorage:', error);
  }
};

/**
 * Valida si existe una sesión activa con token disponible.
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  return Boolean(getAccessToken());
};
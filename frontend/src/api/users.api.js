// ---------------------------------------------------------
// SERVICIO API: USUARIOS, AUTENTICACIÓN Y PERFIL P2P
// ---------------------------------------------------------
import apiClient from '@/api/client';

/**
 * Obtiene el listado público de usuarios de forma paginada.
 * @param {Object} [params]
 * @param {number} [params.limit=20]
 * @param {number} [params.offset=0]
 * @param {import('axios').AxiosRequestConfig} [options]
 * @returns {Promise<any>}
 */
export const getUsersApi = async ({ limit = 20, offset = 0 } = {}, options = {}) => {
  const response = await apiClient.get('/users/', {
    params: { limit, offset },
    ...options,
  });
  return response.data;
};

/**
 * Registra una nueva cuenta de usuario.
 * @param {Object} userData - Datos de registro (username, email, phone_number).
 * @param {import('axios').AxiosRequestConfig} [options]
 * @returns {Promise<any>}
 */
export const registerUserApi = async (userData, options = {}) => {
  const response = await apiClient.post('/auth/register', userData, options);
  return response.data;
};

/**
 * Solicita el código OTP de inicio de sesión vía SMS.
 * @param {string} phoneNumber - Número telefónico con código internacional (+57...).
 * @param {import('axios').AxiosRequestConfig} [options]
 * @returns {Promise<any>}
 */
export const requestOtpApi = async (phoneNumber, options = {}) => {
  const response = await apiClient.post('/auth/request-otp', { phone_number: phoneNumber }, options);
  return response.data;
};

/**
 * Valida el código OTP e inicia la sesión del usuario.
 * @param {string} phoneNumber
 * @param {string} code - Código de 6 dígitos.
 * @param {import('axios').AxiosRequestConfig} [options]
 * @returns {Promise<{ access_token: string, token_type: string, user: Object }>}
 */
export const verifyOtpApi = async (phoneNumber, code, options = {}) => {
  const response = await apiClient.post('/auth/verify-otp', { 
    phone_number: phoneNumber, 
    code 
  }, options);
  return response.data;
};

/**
 * Obtiene el perfil del usuario autenticado actual.
 * @param {import('axios').AxiosRequestConfig} [options]
 * @returns {Promise<any>}
 */
export const getMyProfileApi = async (options = {}) => {
  const response = await apiClient.get('/users/me/profile', options);
  return response.data;
};

/**
 * Obtiene el perfil público de un usuario por su ID.
 * @param {string|number} userId
 * @param {import('axios').AxiosRequestConfig} [options]
 * @returns {Promise<any>}
 */
export const getUserProfileApi = async (userId, options = {}) => {
  const response = await apiClient.get(`/users/${userId}/profile`, options);
  return response.data;
};

/**
 * Actualiza el perfil del usuario en sesión.
 * @param {Object} profileData
 * @param {import('axios').AxiosRequestConfig} [options]
 * @returns {Promise<any>}
 */
export const updateMyProfileApi = async (profileData, options = {}) => {
  const response = await apiClient.put('/users/me/profile', profileData, options);
  return response.data;
};

/**
 * Alterna el estado de seguimiento de un usuario (Follow / Unfollow).
 * @param {string|number} userId - ID del usuario destino.
 * @param {import('axios').AxiosRequestConfig} [options]
 * @returns {Promise<{ is_following: boolean, followers_count: number }>}
 */
export const followUserApi = async (userId, options = {}) => {
  const response = await apiClient.post(`/users/${userId}/follow`, {}, options);
  return response.data;
};

/**
 * Consulta la lista de seguidores de un usuario.
 * @param {string|number} userId
 * @param {Object} [params]
 * @param {import('axios').AxiosRequestConfig} [options]
 * @returns {Promise<Array<Object>>}
 */
export const getUserFollowersApi = async (userId, params = {}, options = {}) => {
  const response = await apiClient.get(`/users/${userId}/followers`, { params, ...options });
  return response.data;
};

/**
 * Consulta los usuarios que sigue un usuario determinado.
 * @param {string|number} userId
 * @param {Object} [params]
 * @param {import('axios').AxiosRequestConfig} [options]
 * @returns {Promise<Array<Object>>}
 */
export const getUserFollowingApi = async (userId, params = {}, options = {}) => {
  const response = await apiClient.get(`/users/${userId}/following`, { params, ...options });
  return response.data;
};
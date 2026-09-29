// ---------------------------------------------------------
// SERVICIO API: USUARIOS, AUTENTICACIÓN Y PERFIL P2P
// ---------------------------------------------------------
import apiClient from './client';

// 1. Listado público paginado (requiere sesión)
export const getUsersApi = async ({ limit = 20, offset = 0 } = {}, options = {}) => {
  const response = await apiClient.get('/users/', {
    params: { limit, offset },
    ...options,
  });
  return response.data;
};

// 2. Registro de usuario
export const registerUserApi = async (userData, options = {}) => {
  const response = await apiClient.post('/auth/register', userData, options);
  return response.data;
};

// 3. Flujo OTP y Login
export const requestOtpApi = async (phoneNumber, options = {}) => {
  const response = await apiClient.post('/auth/request-otp', { phone_number: phoneNumber }, options);
  return response.data;
};

export const verifyOtpApi = async (phoneNumber, code, options = {}) => {
  const response = await apiClient.post('/auth/verify-otp', { 
    phone_number: phoneNumber, 
    code 
  }, options);
  return response.data; // Retorna { access_token, token_type, user }
};

// 4. Perfiles
export const getMyProfileApi = async (options = {}) => {
  const response = await apiClient.get('/users/me/profile', options);
  return response.data;
};

export const getUserProfileApi = async (userId, options = {}) => {
  const response = await apiClient.get(`/users/${userId}/profile`, options);
  return response.data;
};

export const updateMyProfileApi = async (profileData, options = {}) => {
  const response = await apiClient.put('/users/me/profile', profileData, options);
  return response.data;
};
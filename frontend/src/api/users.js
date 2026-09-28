// ---------------------------------------------------------
// SERVICIO API: USUARIOS, AUTENTICACIÓN Y PERFIL P2P
// ---------------------------------------------------------
import apiClient from './client';

// 1. Listado público de usuarios (selector de desarrollo / exploración)
export const getUsersApi = async () => {
  const response = await apiClient.get('/users/');
  return response.data;
};

// 2. Registro oficial de usuario (unificado en /auth/register)
export const registerUserApi = async (userData) => {
  const response = await apiClient.post('/auth/register', userData);
  return response.data;
};

// 3. Flujo OTP y Login formal
export const requestOtpApi = async (phoneNumber) => {
  const response = await apiClient.post('/auth/request-otp', { phone_number: phoneNumber });
  return response.data;
};

export const verifyOtpApi = async (phoneNumber, code) => {
  const response = await apiClient.post('/auth/verify-otp', { 
    phone_number: phoneNumber, 
    code: code 
  });
  return response.data; // Retorna { access_token, token_type, user }
};

// 4. Perfiles (Seguro contra IDOR vía JWT)
export const getMyProfileApi = async () => {
  const response = await apiClient.get('/users/me/profile');
  return response.data;
};

export const getUserProfileApi = async (userId) => {
  const response = await apiClient.get(`/users/${userId}/profile`);
  return response.data;
};

export const updateMyProfileApi = async (profileData) => {
  const response = await apiClient.put('/users/me/profile', profileData);
  return response.data;
};
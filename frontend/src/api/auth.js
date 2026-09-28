// ---------------------------------------------------------
// SERVICIO API: USUARIOS Y AUTENTICACIÓN
// ---------------------------------------------------------
import apiClient from './client';

/**
 * Registra un nuevo usuario en la plataforma.
 * @param {Object} payload - { username: string, email: string, phone_number: string }
 */
export const registerUserApi = async (payload) => {
  const response = await apiClient.post('/auth/register', payload);
  return response.data;
};

/**
 * Verifica el código OTP del celular.
 * @param {Object} payload - { phone_number: string, code: string }
 */
export const verifyOtpApi = async (payload) => {
  const response = await apiClient.post('/auth/verify-code', payload);
  return response.data;
};
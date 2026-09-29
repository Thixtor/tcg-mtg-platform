// ---------------------------------------------------------
// SERVICIO API: AUTENTICACIÓN
// ---------------------------------------------------------
import apiClient from './client';
import { saveSession } from './session';

/**
 * Registra un nuevo usuario en la plataforma.
 */
export const registerUserApi = async (payload, options = {}) => {
  const response = await apiClient.post('/auth/register', payload, options);
  return response.data;
};

/**
 * Solicita el código OTP.
 */
export const requestOtpApi = async (phoneNumber, options = {}) => {
  const response = await apiClient.post('/auth/request-otp', { phone_number: phoneNumber }, options);
  return response.data;
};

/**
 * Verifica el código OTP contra /auth/verify-otp.
 */
export const verifyOtpApi = async (phoneNumber, code, options = {}) => {
  const response = await apiClient.post('/auth/verify-otp', { 
    phone_number: phoneNumber, 
    code: code 
  }, options);

  if (response.data?.access_token) {
    saveSession(response.data);
  }
  return response.data;
};
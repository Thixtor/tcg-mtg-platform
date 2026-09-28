import apiClient from './client';

export const getTradeMarketApi = async (params = {}, options = {}) => {
  const { data } = await apiClient.get('/trade/market', {
    params,
    ...options
  });
  return data;
};

export const getMyTradeMatchesApi = async (options = {}) => {
  const { data } = await apiClient.get('/matchmaking/me', options);
  return data;
};
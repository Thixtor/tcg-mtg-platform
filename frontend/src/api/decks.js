import apiClient from './client';

export const getMyDecksApi = async (options = {}) => {
  const { data } = await apiClient.get('/decks/me', options);
  return data;
};

export const createDeckApi = async (payload) => {
  const { data } = await apiClient.post('/decks/', payload);
  return data;
};

export const getDeckCardsWithStatusApi = async (deckId, options = {}) => {
  const { data } = await apiClient.get(`/decks/${deckId}/cards`, options);
  return data;
};

export const addCardToDeckApi = async (deckId, payload) => {
  const { data } = await apiClient.post(`/decks/${deckId}/cards`, payload);
  return data;
};
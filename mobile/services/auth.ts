import * as SecureStore from 'expo-secure-store';
import api from './api';
import { API_ENDPOINTS } from './endpoints';
import { UserProfile } from '../store/slices/authSlice';

const TOKEN_KEY = 'paperboi-token';

export const login = async (email: string, password: string): Promise<UserProfile> => {
  const { data } = await api.post(API_ENDPOINTS.authLogin, { email, password });
  await SecureStore.setItemAsync(TOKEN_KEY, data.token);
  return { id: data.id, email: data.email, name: data.name, token: data.token };
};

export const register = async (name: string, email: string, password: string): Promise<UserProfile> => {
  const { data } = await api.post(API_ENDPOINTS.authRegister, { name, email, password });
  await SecureStore.setItemAsync(TOKEN_KEY, data.token);
  return { id: data.id, email: data.email, name: data.name, token: data.token };
};

export const getAuthToken = async () => SecureStore.getItemAsync(TOKEN_KEY);

export const logout = async () => SecureStore.deleteItemAsync(TOKEN_KEY);

import api from './api';
import { endpoints } from './endpoints';
import { UserProfile } from '@store/slices/authSlice';

const login = async (email: string, password: string): Promise<UserProfile> => {
  const response = await api.post<UserProfile>(endpoints.auth.login, { email, password });
  return response.data;
};

const register = async (email: string, password: string, name: string): Promise<UserProfile> => {
  const response = await api.post<UserProfile>(endpoints.auth.register, { email, password, name });
  return response.data;
};

const logout = async () => Promise.resolve();

export default { login, register, logout };

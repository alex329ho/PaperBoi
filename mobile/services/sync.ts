import { retry } from '@utils/retry';
import api from './api';

export const syncOfflineChanges = async () => {
  return retry(async () => {
    await api.post('/sync');
  });
};

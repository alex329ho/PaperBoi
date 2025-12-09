import NetInfo from '@react-native-community/netinfo';
import { store } from '../store/store';
import { fetchTopStories } from './api';

export const syncOfflineData = async () => {
  const network = await NetInfo.fetch();
  if (!network.isConnected) return;

  const articles = await fetchTopStories();
  store.dispatch({ type: 'news/loadTopStories/fulfilled', payload: articles });
};

import NetInfo from '@react-native-community/netinfo';
import { fetchNews } from '../store/thunks/newsThunks';
import { store } from '../store/store';

export const syncOfflineData = async () => {
  const network = await NetInfo.fetch();
  if (!network.isConnected) return;

  await store.dispatch(fetchNews({}));
};

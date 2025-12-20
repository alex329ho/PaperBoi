const axios = require('axios');
const Constants = (() => {
  try {
    return require('expo-constants');
  } catch (e) {
    return { expoConfig: {}, manifest: {} };
  }
})();

const normalizeBaseUrl = (url) => (url ? url.replace(/\/api\/v1\/?$/, '') : url);

const baseURL = normalizeBaseUrl(
  (Constants.expoConfig && Constants.expoConfig.extra && Constants.expoConfig.extra.apiBaseUrl) ||
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    'https://api.example.com',
);

const apiClient = axios.create({
  baseURL,
  timeout: Number(process.env.EXPO_PUBLIC_API_TIMEOUT) || 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

module.exports = apiClient;

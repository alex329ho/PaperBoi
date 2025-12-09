# npm install troubleshooting

- `npm install` failed with HTTP 403 while fetching `@react-native-async-storage/async-storage`.
- Retried with `npm install --legacy-peer-deps` and `npm install --force`; both failed with the same 403 error.
- `npx expo doctor` redirected to `npx expo-doctor`, which also failed to download due to the 403 response.
- Errors suggest restricted access to the npm registry in the current environment.

Logs referenced:
- /root/.npm/_logs/2025-12-09T16_17_06_847Z-debug-0.log
- /root/.npm/_logs/2025-12-09T16_17_10_643Z-debug-0.log
- /root/.npm/_logs/2025-12-09T16_17_13_979Z-debug-0.log
- /root/.npm/_logs/2025-12-09T16_17_20_362Z-debug-0.log

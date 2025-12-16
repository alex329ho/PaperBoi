# PaperBoi Mobile

React Native + Expo application for the PaperBoi news summarization experience.

## Tech Stack

- **Expo** (React Native) with TypeScript
- **Expo Router** for file-based navigation
- **Redux Toolkit** with **Redux Persist** for state management
- **React Native Paper** for UI components
- **Firebase** via Expo for notifications
- **Jest** + **React Native Testing Library** for testing

## Project Structure

```
app/
├── _layout.tsx               # Root layout with providers
├── index.tsx                 # Splash entry
├── [article_id].tsx          # Article detail
├── auth/                     # Auth stack
│   ├── _layout.tsx
│   ├── login.tsx
│   ├── register.tsx
│   └── forgot-password.tsx
└── (tabs)/                   # Tab navigator
    ├── _layout.tsx
    ├── home.tsx
    ├── search.tsx
    ├── saved.tsx
    └── settings.tsx
components/                   # Shared UI components
hooks/                        # Custom hooks
services/                     # API, storage, notifications
store/                        # Redux slices, middleware, persist config
utils/                        # Constants, helpers
assets/                       # Images and fonts
```

## Getting Started

1. **Use the supported Node.js version**

   Expo SDK 51/52 runs on Node 18, 20, 22, and 24. This project is pinned to
   Node 24.11.1 via `.nvmrc` so `nvm use` will switch you to a supported runtime.
   If you are on macOS and see `spawn /usr/local/bin/node EAGAIN` from
   `npx expo start`, switch to the project Node version with `nvm`:

   ```bash
   nvm use
   ```

2. **Install dependencies**

   ```bash
   cd mobile
   npm install
   ```

3. **Environment variables**
   - Copy `.env.example` to `.env.local` and update values.
   - Expo automatically loads `EXPO_PUBLIC_*` variables.

4. **Run the app**
   ```bash
   npm run start
   # or
   npm run android
   npm run ios
   ```

### macOS simulator prerequisites

If `npx expo start --ios` fails with `xcrun simctl help exited with non-zero code: 72`, the Xcode tools the simulator depends on are missing or misconfigured. Fix it with the following steps (in order):

1. **Install Xcode Command Line Tools** so `simctl` is available:

   ```bash
   xcode-select --install
   ```

2. **Point to the correct Developer folder** (sometimes CLT installs but `xcrun` still looks in the wrong place):

   ```bash
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   ```

3. **Accept Xcode’s license** (otherwise `xcrun` can exit with code 72):

   ```bash
   sudo xcodebuild -license accept
   ```

4. **Verify `simctl` works**, then rerun Expo:
   ```bash
   xcrun simctl list devices
   npx expo start --ios
   ```

If you still see the error, open the Xcode app once to finish setup, then repeat step 4.

5. **Type checking & linting**

   ```bash
   npm run typecheck
   npm run lint
   npm run format
   ```

6. **Testing**

   ```bash
   npm test
   ```

7. **Builds (EAS)**
   ```bash
   npm run build:dev
   npm run build:prod
   ```

## Navigation

- **Expo Router** drives navigation via the `app/` directory.
- `(tabs)` contains the bottom tab navigator.
- `auth` stack handles login/register flows.
- Dynamic article route `[article_id].tsx` renders article details from store.

## State Management

- `store/store.ts` configures Redux Toolkit, persistence, and DevTools.
- Slices live under `store/slices/` (auth, news, preferences, ui, settings).
- Middleware (`store/middleware/`) handles analytics toggling and error propagation.

## Firebase & Notifications

- Notification permissions handled in `hooks/usePushNotifications` and `services/notifications`.
- Configure Firebase keys in `.env.local` using `EXPO_PUBLIC_FIREBASE_*` variables.

## Code Quality

- ESLint + Prettier configs at repo root.
- Husky + lint-staged run lint/format on staged files (`npm run prepare`).

## Testing Notes

- Jest configured with `jest-expo` and React Native Testing Library in `jest.config.js`.

## Assets

- Placeholder assets exist under `assets/images` and `assets/fonts`. Replace with production-ready files before release.

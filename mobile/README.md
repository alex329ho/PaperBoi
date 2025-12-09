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
1. **Install dependencies**
   ```bash
   cd mobile
   npm install
   ```

2. **Environment variables**
   - Copy `.env.example` to `.env.local` and update values.
   - Expo automatically loads `EXPO_PUBLIC_*` variables.

3. **Run the app**
   ```bash
   npm run start
   # or
   npm run android
   npm run ios
   ```

4. **Type checking & linting**
   ```bash
   npm run typecheck
   npm run lint
   npm run format
   ```

5. **Testing**
   ```bash
   npm test
   ```

6. **Builds (EAS)**
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

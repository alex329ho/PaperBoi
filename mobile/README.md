# PaperBoi Mobile

React Native + Expo mobile client for the PaperBoi news summarization app. The project uses Expo Router for navigation and Redux Toolkit with persistence for state management.

## Getting started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment variables and update values:
   ```bash
   cp .env.example .env.local
   ```
3. Run the app:
   ```bash
   npm run start
   ```

## Scripts
- `npm run start:dev` - start Expo in development mode
- `npm run start:prod` - start Expo with production flags
- `npm run lint` - run ESLint
- `npm run test` - run Jest suite
- `npm run format` - apply Prettier formatting

## Testing
Jest with React Native Testing Library is configured via `jest-expo` and `jest.setup.js`.

## Tooling
- Expo Router with typed routes
- Redux Toolkit + Redux Persist with AsyncStorage
- Firebase initialization stub for authentication
- Husky pre-commit hook running lint-staged

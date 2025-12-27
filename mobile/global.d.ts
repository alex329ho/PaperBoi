declare module '@expo/vector-icons/build/vendor/react-native-vector-icons/lib/create-icon-set';
declare module '@react-native/assets-registry/registry';
declare module 'expo-manifests';
declare module '@react-native-vector-icons/material-design-icons';
declare module 'react-native-vector-icons/MaterialCommunityIcons';

declare module 'src/types' {
  export * from 'react-native-paper/lib/typescript/types';
}

declare namespace React {
  type ReactNode = any;
  type PropsWithChildren<P = any> = P & { children?: ReactNode };
  type ReactElement = any;
  type Dispatch<A> = (value: A) => void;
  type SetStateAction<S> = S | ((prevState: S) => S);
  interface FC<P = {}> {
    (props: PropsWithChildren<P>): any;
  }
  class Component<P = {}, S = {}> {
    constructor(props: PropsWithChildren<P>);
    props: PropsWithChildren<P>;
    state: S;
    setState(state: Partial<S>): void;
    render(): any;
  }
  function useState<T = any>(initial?: T): [T, Dispatch<SetStateAction<T>>];
  function useEffect(effect: (...args: any[]) => any, deps?: any[]): void;
  function useMemo<T>(factory: () => T, deps?: any[]): T;
  function useCallback<T extends (...args: any[]) => any>(callback: T, deps?: any[]): T;
  function useRef<T = any>(initial?: T): { current: T };
}

declare module 'react' {
  export default React;
  export const useState: typeof React.useState;
  export const useEffect: typeof React.useEffect;
  export const useMemo: typeof React.useMemo;
  export const useCallback: typeof React.useCallback;
  export const useRef: typeof React.useRef;
  export type FC<P = {}> = React.FC<P>;
  export type ReactNode = React.ReactNode;
  export type ReactElement = React.ReactElement;
  export type PropsWithChildren<P = any> = React.PropsWithChildren<P>;
  export type Dispatch<A> = React.Dispatch<A>;
  export type SetStateAction<S> = React.SetStateAction<S>;
  export class Component<P = {}, S = {}> extends React.Component<P, S> {}
}

interface ProcessEnv {
  EXPO_PUBLIC_API_BASE_URL?: string;
  EXPO_PUBLIC_WEB_API_BASE_URL?: string;
  EXPO_PUBLIC_API_TIMEOUT?: string;
  NODE_ENV?: string;
}

declare const process: {
  env: ProcessEnv;
};

declare const global: any;
declare const __DEV__: boolean;

declare module 'react';
declare module 'react-native';
declare module 'react-native-paper';
declare module 'expo-router';
declare module 'expo';
declare module 'expo-constants';
declare module 'expo-notifications';
declare module 'expo-secure-store';
declare module '@react-native-async-storage/async-storage';
declare module '@testing-library/react-native';
declare module 'expo-splash-screen';
declare module 'expo-font';
declare module 'redux-persist/integration/react';
declare module 'expo-web-browser';

declare function require(path: string): any;
declare function setTimeout(
  handler: (...args: any[]) => void,
  timeout?: number,
  ...args: any[]
): any;
declare function clearTimeout(handle?: any): void;
declare module 'react-native-safe-area-context';
declare module 'redux-persist';
declare module 'redux-persist/lib/stateReconciler/autoMergeLevel2';
declare module 'redux-persist/es/types';
declare module 'reselect';

declare module '@expo/vector-icons';

declare module '@react-native-community/netinfo' {
  export interface NetInfoState {
    type?: string;
    isConnected?: boolean;
    isInternetReachable?: boolean | null;
    details?: Record<string, any>;
  }

  export type NetInfoSubscription = { unsubscribe: () => void };

  export const fetch: () => Promise<NetInfoState>;
  export const addEventListener: (listener: (state: NetInfoState) => void) => NetInfoSubscription;
}

declare module 'firebase/app' {
  export type FirebaseApp = any;
  export function initializeApp(config: any): FirebaseApp;
  export function getApps(): FirebaseApp[];
}

declare module 'firebase/messaging' {
  export type Messaging = any;
  export function getMessaging(app?: any): Messaging;
  export function getToken(messaging: Messaging, options?: any): Promise<string | null>;
  export function onMessage(messaging: Messaging, handler: (payload: any) => any): any;
  export function onTokenRefresh(messaging: Messaging, handler: (token: string) => any): any;
}

declare const Buffer: {
  from(input: string, encoding?: string): { toString: (encoding?: string) => string };
  byteLength: (value: string, encoding?: string) => number;
};

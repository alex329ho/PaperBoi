import { TypedUseSelectorHook, useSelector } from 'react-redux';
import type { StoreRootState } from '../store/store';

// Typed selector hook for the PaperBoi app
export const useAppSelector: TypedUseSelectorHook<StoreRootState> = useSelector;

export default useAppSelector;

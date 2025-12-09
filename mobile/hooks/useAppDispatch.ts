import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../store/store';

// Typed dispatch hook for the PaperBoi app
export const useAppDispatch = () => useDispatch<AppDispatch>();

export default useAppDispatch;

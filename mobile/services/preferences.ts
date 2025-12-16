import { setRegions, setTopics, setDigestTime } from '../store/slices/preferencesSlice';
import { AppDispatch } from '../store/store';

export const updatePreferences = (
  dispatch: AppDispatch,
  options: { topics?: string[]; regions?: string[]; digestTime?: string },
) => {
  if (options.topics) dispatch(setTopics(options.topics));
  if (options.regions) dispatch(setRegions(options.regions));
  if (options.digestTime !== undefined) dispatch(setDigestTime(options.digestTime));
};

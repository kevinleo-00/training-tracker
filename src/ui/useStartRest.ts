import { useDispatch } from '../store/react';
import { restTimer } from '../store/restTimer';
import { unlockAudio } from './device';

/** Starts a rest from a tap. Call only from a user gesture so audio can unlock. */
export function useStartRest() {
  const dispatch = useDispatch();
  return (seconds: number) => {
    unlockAudio();
    restTimer.start(seconds);
    dispatch({ type: 'settings/update', patch: { lastRestSec: seconds } });
  };
}

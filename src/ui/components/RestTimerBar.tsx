import { type CSSProperties, useEffect, useState } from 'react';
import { remainingMs } from '../../domain/timer';
import { useAppState } from '../../store/react';
import { restTimer, useRestTimer } from '../../store/restTimer';
import { alertRestOver, useWakeLock } from '../device';
import { formatClock, formatSeconds } from '../format';
import { THEMES } from '../themes';
import { useStartRest } from '../useStartRest';
import { Icon } from './Icon';

function useNow(active: boolean): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!active) return;
    const update = () => setNow(Date.now());
    const id = setInterval(update, 250);
    document.addEventListener('visibilitychange', update);
    update();
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', update);
    };
  }, [active]);
  return now;
}

/** The compact bar above the tab bar: one-tap presets when idle, the countdown otherwise. */
export function RestTimerBar() {
  const timer = useRestTimer();
  const { settings } = useAppState();
  const startRest = useStartRest();
  const running = timer.status === 'running';
  const now = useNow(running);
  useWakeLock(running);

  useEffect(() => {
    if (running && now >= timer.endsAt && restTimer.tick()) alertRestOver(THEMES[settings.theme].restOver);
  }, [running, now, timer, settings.theme]);

  if (timer.status === 'idle') {
    return (
      <div className="timer-bar presets" role="group" aria-label="Start rest timer">
        <span className="timer-label">
          <Icon name="timer" size={18} />
          Rest
        </span>
        {settings.restPresetsSec.map((sec) => (
          <button key={sec} type="button" className={sec === settings.lastRestSec ? 'chip current' : 'chip'} onClick={() => startRest(sec)}>
            {formatSeconds(sec)}
          </button>
        ))}
      </div>
    );
  }

  if (timer.status === 'finished') {
    return (
      <button type="button" className="timer-bar finished" onClick={restTimer.cancel} aria-live="assertive">
        <span className="timer-time">Rest over</span>
        <span className="timer-sub">Tap to dismiss</span>
      </button>
    );
  }

  const left = remainingMs(timer, now);
  const progress = timer.durationMs > 0 ? left / timer.durationMs : 0;
  return (
    <div className="timer-bar active" role="timer" aria-label="Rest timer">
      <div className="timer-progress" style={{ '--progress': progress } as CSSProperties} />
      <div className="timer-readout">
        <span className="timer-time">{formatClock(left)}</span>
        <span className="timer-sub">{timer.status === 'paused' ? 'Paused' : 'Resting'}</span>
      </div>
      <button type="button" className="chip" onClick={() => restTimer.addTime(15_000)}>
        +15s
      </button>
      {timer.status === 'running' ? (
        <button type="button" className="icon-button" aria-label="Pause rest" onClick={restTimer.pause}>
          <Icon name="pause" />
        </button>
      ) : (
        <button type="button" className="icon-button" aria-label="Resume rest" onClick={restTimer.resume}>
          <Icon name="play" />
        </button>
      )}
      <button type="button" className="icon-button" aria-label="Cancel rest" onClick={restTimer.cancel}>
        <Icon name="close" />
      </button>
    </div>
  );
}

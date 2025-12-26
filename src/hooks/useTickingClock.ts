import { useEffect, useState } from 'react';
import * as date from 'date-and-time';

export function useTickingClock(format = 'HH:mm:ss') {
  const [timeLabel, setTimeLabel] = useState('');

  useEffect(() => {
    const tick = () => setTimeLabel(date.format(new Date(), format));
    tick();
    const interval = setInterval(tick, 1_000);
    return () => clearInterval(interval);
  }, [format]);

  return timeLabel;
}

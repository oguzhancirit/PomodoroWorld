import { describe, it, expect } from 'vitest';
import { phaseAlert } from '../src/timer';

// v1 js/app.js: start sound + wake lock when focus starts; at focus end "Pomodoro tamamlandı" (long break every 4th),
// blinking title "Mola zamanı!"; at break end "Mola bitti"; stopping releases the wake lock.
describe('phaseAlert', () => {
  it('focus starting: start sound, keep the screen on, ask for notifications', () => {
    expect(phaseAlert('idle', 'focus', 0)).toEqual({ sound: 'start', wake: true, ask: true });
  });
  it('focus ended into a short break: done sound, notice and blinking title', () => {
    expect(phaseAlert('focus', 'short_break', 1)).toEqual({ sound: 'done', wake: true, title: 'Mola zamanı!', note: { t: 'Pomodoro tamamlandı', b: 'Mola zamanı: su iç, esne.' } });
  });
  it('the 4th focus says long break', () => {
    expect(phaseAlert('focus', 'long_break', 4).note?.b).toBe('Uzun mola zamanı. Kalk, biraz yürü.');
  });
  it('break over (back to idle or into focus): "Mola bitti"', () => {
    expect(phaseAlert('short_break', 'idle', 1)).toEqual({ sound: 'start', wake: false, note: { t: 'Mola bitti', b: 'Hazırsan yeni turu başlat.' } });
    expect(phaseAlert('long_break', 'focus', 4).note?.t).toBe('Mola bitti');
  });
  it('stopping a focus: only the screen lock is released', () => {
    expect(phaseAlert('focus', 'idle', 0)).toEqual({ wake: false });
  });
  it('no change: nothing', () => {
    expect(phaseAlert('focus', 'focus', 1)).toBeNull();
  });
});

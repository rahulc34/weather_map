import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { formatTime, formatWindow } from './format.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';

describe('formatWindow', () => {
  const win = { start: '2026-11-26T08:30:00.000Z', end: '2026-11-26T11:30:00.000Z' };

  it('formats a same-day window without the weekday', () => {
    const text = formatWindow(win, 'en', new Date('2026-11-26T08:00:00.000Z'));
    expect(text).toContain('–');
    expect(text).not.toMatch(/Thu/);
  });

  it('adds the weekday for another day', () => {
    expect(formatWindow(win, 'en', new Date('2026-11-20T08:00:00.000Z'))).toMatch(/Thu/);
  });

  it('formats in Hindi locale', () => {
    expect(formatTime(win.start, 'hi')).toBeTruthy();
  });
});

describe('useDebouncedValue', () => {
  it('only updates after the delay', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), {
      initialProps: { v: 'a' },
    });
    rerender({ v: 'ab' });
    rerender({ v: 'abc' });
    expect(result.current).toBe('a');
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe('abc');
    vi.useRealTimers();
  });
});

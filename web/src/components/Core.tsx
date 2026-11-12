import React, { useId } from 'react';
import type { Mode } from '../../../shared/contracts';
export type CoreState = 'idle' | 'loading' | 'saving' | 'success' | 'error';
export function Core({ mode = 'live', status = '', state, compact = false }: { mode?: Mode; status?: string; state?: CoreState; compact?: boolean }) {
  const id = useId();
  const activity = state ?? (/ERROR|DENIED/.test(status) ? 'error' : /LOADING/.test(status) ? 'loading' : /SAVING|GENERERAS|SIGNING/.test(status) ? 'saving' : 'idle');
  return <div className={`core ${mode}${compact ? ' core-compact' : ''}`} data-state={activity} aria-hidden="true">
    <div className="core-aura" />
    <svg className="core-orbit" viewBox="0 0 200 200" fill="none" focusable="false">
      <defs><linearGradient id={id} x1="20" y1="10" x2="165" y2="185" gradientUnits="userSpaceOnUse"><stop stopColor="currentColor" stopOpacity=".75" /><stop offset=".45" stopColor="currentColor" stopOpacity=".08" /><stop offset="1" stopColor="currentColor" stopOpacity=".4" /></linearGradient></defs>
      <circle cx="100" cy="100" r="86" stroke={`url(#${id})`} strokeWidth=".8" strokeDasharray="360 45 90 46" transform="rotate(-55 100 100)" />
      <ellipse cx="100" cy="100" rx="95" ry="66" stroke={`url(#${id})`} strokeWidth=".7" transform="rotate(-32 100 100)" />
      <circle cx="166" cy="45" r="2.2" fill="currentColor" />
    </svg>
    <div className="core-surface"><svg viewBox="0 0 64 64" fill="none" focusable="false"><path d="M39 16v24c0 8-4 12-11 12-6 0-10-3-11-8M31 16h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></div>
  </div>;
}

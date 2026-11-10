import React from 'react';
const paths = {
  command: 'M4 5h16v12H8l-4 3V5Zm4 5h8m-8 4h5',
  voice: 'M12 3v18M7 7v10M17 7v10M3 10v4m18-4v4',
  agents: 'M8 8h8v8H8zM12 3v5m0 8v5M3 12h5m8 0h5M5.5 5.5 8 8m8 8 2.5 2.5M18.5 5.5 16 8m-8 8-2.5 2.5',
  chevron: 'm9 5 7 7-7 7', arrow: 'M12 19V5m-6 6 6-6 6 6',
  check: 'm5 12 4 4L19 6', plus: 'M12 5v14M5 12h14', close: 'm6 6 12 12M18 6 6 18',
  search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM16 16l4 4', more: 'M5 12h.01M12 12h.01M19 12h.01',
  edit: 'm14 5 5 5M4 20l5-1L20 8a2 2 0 0 0-4-4L5 15l-1 5Z',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7m4-7v7', archive: 'M4 4h16v4H4zm1 4v12h14V8m-10 4h6',
  logout: 'M10 4H4v16h6m3-12 4 4-4 4m-5-4h12', lock: 'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5zm7 4v3',
  alert: 'M12 8v5m0 3h.01M10.2 4.2 2.6 18a1.4 1.4 0 0 0 1.2 2h16.4a1.4 1.4 0 0 0 1.2-2L13.8 4.2a2 2 0 0 0-3.6 0Z',
  refresh: 'M20 10a8 8 0 0 0-14-5L3 8m0-5v5h5M4 14a8 8 0 0 0 14 5l3-3m-5 0h5v5',
  tasks: 'm3 6 2 2 3-4m-5 9 2 2 3-4m3-5h10m-10 7h10M4 20h17', stop: 'M6 6h12v12H6z',
  shield: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6',
  microphone: 'M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0V5Zm-3 6v1a6 6 0 0 0 12 0v-1m-6 7v4m-3 0h6',
  arrowLeft: 'M20 12H4m6-6-6 6 6 6',
} as const;
export type IconName = keyof typeof paths;
export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return <svg className={`icon ${className}`} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={name === 'more' ? 3 : 1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[name]} /></svg>;
}

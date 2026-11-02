// Where the game server lives. No server configured and not running locally (e.g. a Claude artifact)
// → demo mode: the same rules run in the browser with bot classmates.
export const CONFIGURED = import.meta.env.VITE_SERVER_URL as string | undefined;
export const SERVER = CONFIGURED || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.hostname}:2567`;
export const HTTP_BASE = SERVER.replace(/^ws/, 'http');
export const DEMO_ONLY = new URLSearchParams(location.search).has('demo') || (!CONFIGURED && !/^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname));
